const express = require("express");
const cors = require("cors");
const { scrapeDomains } = require("./scraper");
const sources = require("./config/sources");

const app = express();
const port = 5001;

app.use(cors({ origin: "http://localhost:3000" }));

app.get("/sources", (req, res) => {
  try {
    const sourcesList = Object.entries(sources).map(([id, source]) => ({
      id,
      name: source.name,
      types: source.types.map(type => ({
        id: type.id,
        name: type.name
      }))
    }));
    
    res.json({ success: true, sources: sourcesList });
  } catch (error) {
    console.error("Lỗi khi lấy sources:", error);
    res.status(500).json({ 
      success: false, 
      message: "Không thể lấy danh sách sources"
    });
  }
});

app.get("/scrape-domains", async (req, res) => {
  try {
    const { source, type } = req.query;
    if (!source || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu thông tin source hoặc type" 
      });
    }

    const domains = await scrapeDomains(source, type);
    res.json({ 
      success: true, 
      domains,
      message: `Đã thu thập và lưu ${domains.length} domain thành công`
    });
  } catch (error) {
    console.error("Lỗi khi scraping:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
});

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
