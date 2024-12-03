const sources = {
  BID_PAVIETNAM: {
    name: "bid.pavietnam.vn",
    types: [
      {
        id: "auction-close",
        name: "Đấu giá đã kết thúc",
        url: "https://bid.pavietnam.vn/auction-close/page/",
        hasPagination: true,
        selector: {
          rows: "article table tbody tr",
          domain: "td:first-child",
          age: "td:nth-child(4)",
          price: "td:nth-child(3)",
          endDate: "td:nth-child(2)",
          auctionLink: "td:last-child a",
        },
      },
      {
        id: "auction-live",
        name: "Đang đấu giá",
        url: "https://bid.pavietnam.vn/page/",
        hasPagination: true,
        selector: {
          rows: "article table tbody tr",
          domain: "td:nth-child(1)",
          age: "td:nth-child(2)",
          price: "td:nth-child(3)",
          timeLeft: "td:nth-child(4)",
          auctionLink: "td:last-child a",
        },
      },
    ],
  },
  INET: {
    name: "backorder.inet.vn",
    types: [
      {
        id: "domain-unregister",
        name: "Domain sắp xóa",
        url: "https://backorder.inet.vn/domain-unregister?page=",
        hasPagination: true,
        selector: {
          rows: "tr[ng-repeat-start='domain in vm.domains.content']",
          domain: "td:first-child .btn-group-actions strong.ng-binding",
          age: "td:nth-child(5) span.ng-binding",
          endDate: "td:nth-child(2) span.ng-binding",
          viewed: "td:nth-child(4) span.ng-binding",
          star: "td:nth-child(3) div.star-group",
          auctionLink: "td:last-child a.btn.btn-success",
          pagination: "ul.pagination"
        }
      }
    ]
  }
};

module.exports = sources;
