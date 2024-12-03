const puppeteer = require("puppeteer");
const { db } = require("./firebase-admin");
const admin = require("firebase-admin");
const sources = require("./config/sources");

const scrapeDomains = async (sourceId, typeId) => {
  try {
    // Validate source và type
    const source = sources[sourceId];
    if (!source) throw new Error("Source không hợp lệ");

    const sourceType = source.types.find((t) => t.id === typeId);
    if (!sourceType) throw new Error("Type không hợp lệ");

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);

    // Lấy domains hiện có
    const existingDomainsSnapshot = await db
      .collection("domains")
      .select("domain")
      .get();

    const existingDomains = new Set();
    existingDomainsSnapshot.docs.forEach((doc) => {
      const domain = doc.data().domain;
      if (domain) existingDomains.add(domain.toLowerCase());
    });

    console.log(`Hiện có ${existingDomains.size} domain trong database`);

    const allDomains = [];
    const batchId = new Date().toISOString();
    let hasNewDomains = false;

    async function scrapePage(url) {
      try {
        await page.goto(url, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });

        // Xử lý riêng cho INET
        if (sourceId === 'INET') {
          // Đợi cho content load xong
          await page.waitForSelector('tr.dmnRow0, tr.dmnRow1, tr.dmnRow2', {
            timeout: 30000
          });

          // Scroll để load thêm data nếu cần
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });

          // Đợi thêm 2s để data load đầy đủ
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Xử lý cho bid.pavietnam.vn
          await page.waitForSelector(sourceType.selector.rows, { timeout: 10000 });
        }

        return page.evaluate((selector, source, type) => {
          const rows = document.querySelectorAll(selector.rows);
          return Array.from(rows)
            .map((row) => {
              const domainCell = row.querySelector(selector.domain);
              const ageCell = row.querySelector(selector.age);
              const endDateCell = row.querySelector(selector.endDate);
              const viewedCell = row.querySelector(selector.viewed);
              const starGroup = row.querySelector(selector.star);
              const auctionLink = row.querySelector(selector.auctionLink);

              if (domainCell) {
                // Xử lý dữ liệu tùy theo source
                if (source === 'INET') {
                  return {
                    domain: domainCell.textContent.trim(),
                    age: ageCell ? parseInt(ageCell.textContent.trim()) || 0 : 0,
                    endDate: endDateCell ? endDateCell.textContent.trim() : "",
                    viewed: viewedCell ? parseInt(viewedCell.textContent.trim()) || 0 : 0,
                    stars: starGroup ? starGroup.querySelectorAll('i.ion-ios-star').length : 0,
                    source: source,
                    sourceType: type,
                    auctionUrl: auctionLink ? auctionLink.href : "",
                    auctionStatus: "closed"
                  };
                } else {
                  // Xử lý cho bid.pavietnam.vn giữ nguyên như cũ
                  // ... code xử lý bid.pavietnam.vn
                }
              }
              return null;
            })
            .filter(Boolean);
        }, sourceType.selector, sourceId, typeId);
      } catch (error) {
        console.error(`Lỗi khi scrape trang ${url}:`, error.message);
        throw error;
      }
    }

    if (sourceType.hasPagination) {
      // Xử lý trang có phân trang
      const maxPages = sourceId === 'INET' ? 10 : 4; // INET có 10 trang, BID có 4 trang

      for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        try {
          console.log(`\nĐang quét trang ${currentPage}...`);
          
          // Format URL phân trang theo từng source
          const pageUrl = sourceId === 'INET' 
            ? `${sourceType.url}${currentPage}` // INET: ?page=1
            : `${sourceType.url}${currentPage}`; // BID: /page/1

          const domains = await scrapePage(pageUrl);

          // Xử lý domains mới
          await processNewDomains(domains);

          // Đợi 2s trước khi sang trang tiếp
          await new Promise((resolve) => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`Lỗi tại trang ${currentPage}:`, error.message);
          if (currentPage === 1) throw error;
          break;
        }
      }
    } else {
      // Xử lý trang không có phân trang
      try {
        console.log(`\nĐang quét trang ${sourceType.name}...`);
        const domains = await scrapePage(sourceType.url);
        await processNewDomains(domains);
      } catch (error) {
        console.error("Lỗi khi quét trang:", error.message);
        throw error;
      }
    }

    async function processNewDomains(domains) {
      try {
        // Lọc domain trùng trong cùng batch trước khi kiểm tra database
        const seenDomains = new Set();
        const uniqueDomains = domains.filter((domain) => {
          const lowercaseDomain = domain.domain.toLowerCase();
          if (seenDomains.has(lowercaseDomain)) {
            return false;
          }
          seenDomains.add(lowercaseDomain);
          return true;
        });

        // Kiểm tra với database
        const newDomains = [];
        for (const domain of uniqueDomains) {
          const lowercaseDomain = domain.domain.toLowerCase();

          // Kiểm tra domain đã tồn tại trong database chưa
          const domainQuery = await db
            .collection("domains")
            .where("domain", "==", lowercaseDomain)
            .limit(1) // Thêm limit để tối ưu query
            .get();

          if (domainQuery.empty && !existingDomains.has(lowercaseDomain)) {
            newDomains.push(domain);
            existingDomains.add(lowercaseDomain);
          } else {
            console.log(`Domain ${domain.domain} đã tồn tại, bỏ qua.`);
          }
        }

        if (newDomains.length === 0) {
          console.log(`- Không có domain mới`);
          return;
        }

        hasNewDomains = true;
        console.log(`- Tìm thấy ${newDomains.length} domain mới`);

        // Lưu domains mới vào database
        const batch = db.batch();
        for (const domain of newDomains) {
          const domainWithMetadata = {
            ...domain,
            domain: domain.domain.toLowerCase(),
            batchId,
            createdAt: admin.firestore.Timestamp.now(),
            index: allDomains.length + 1,
            status: "active",
          };

          allDomains.push(domainWithMetadata);
          const docRef = db.collection("domains").doc();
          batch.set(docRef, domainWithMetadata);
        }

        await batch.commit();
        console.log(`- Đã lưu ${newDomains.length} domain mới vào database`);
      } catch (error) {
        console.error("Lỗi khi xử lý domains mới:", error);
        throw error;
      }
    }

    await browser.close();

    if (hasNewDomains) {
      await db.collection("batches").doc(batchId).set({
        timestamp: admin.firestore.Timestamp.now(),
        totalDomains: allDomains.length,
        source: sourceId,
        sourceType: typeId,
        status: "completed",
      });

      console.log(
        `\nHoàn thành! Đã thêm ${allDomains.length} domain mới vào database`
      );
      return allDomains;
    }

    console.log("\nKhông tìm thấy domain mới nào");
    return [];
  } catch (error) {
    console.error("Lỗi trong quá trình scraping:", error);
    throw error;
  }
};

module.exports = { scrapeDomains };
