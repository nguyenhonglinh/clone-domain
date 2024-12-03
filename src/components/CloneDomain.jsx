import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  TablePagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Container,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
} from "@mui/material";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";

import { db } from "../firebase-config";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import axios from "axios";

const CloneDomain = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [domains, setDomains] = useState([]);
  const [filteredDomains, setFilteredDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [ageFilter, setAgeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("index");
  const [isScrapingData, setIsScrapingData] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState(null);
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [viewType, setViewType] = useState("all");

  const fetchDomains = async (type = viewType) => {
    setLoading(true);
    setError(null);
    try {
      let domainsQuery;
      
      if (type === "all") {
        // Nếu chọn "all" thì lấy tất cả domain
        domainsQuery = query(
          collection(db, "domains"),
          orderBy("createdAt", "desc")
        );
      } else {
        // Nếu chọn specific type thì lọc theo auctionStatus
        domainsQuery = query(
          collection(db, "domains"),
          where("auctionStatus", "==", type),
          orderBy("createdAt", "desc")
        );
      }

      const querySnapshot = await getDocs(domainsQuery);

      if (querySnapshot.empty) {
        setError(`Không có dữ liệu domain nào${type !== 'all' ? ` cho loại "${type}"` : ''}`);
        setDomains([]);
        setFilteredDomains([]);
        return;
      }

      const domainMap = new Map();
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const domain = data.domain.toLowerCase();
        const timestamp = data.createdAt?.toDate();

        if (!domainMap.has(domain) || 
            timestamp > domainMap.get(domain).timestamp) {
          domainMap.set(domain, {
            id: doc.id,
            ...data,
            timestamp,
            createdAt: timestamp.toLocaleString()
          });
        }
      });

      const uniqueDomains = Array.from(domainMap.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(domain => {
          const { timestamp, ...rest } = domain;
          return rest;
        });

      setDomains(uniqueDomains);
      setFilteredDomains(uniqueDomains);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      setError("Không thể kết nối với database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    filterDomains();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, ageFilter, sortBy, domains]);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await axios.get("http://localhost:5001/sources");
        if (response.data.success) {
          console.log("Sources loaded:", response.data.sources); // Debug
          setSources(response.data.sources);
        }
      } catch (error) {
        console.error("Lỗi khi lấy danh sách sources:", error);
        setError("Không thể lấy danh sách nguồn. Vui lòng thử lại sau.");
      }
    };
    fetchSources();
  }, []);

  const filterDomains = () => {
    let filtered = [...domains];

    if (searchTerm) {
      filtered = filtered.filter(
        (domain) =>
          domain.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          domain.source?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (ageFilter !== "all") {
      const [min, max] = ageFilter.split("-").map(Number);
      filtered = filtered.filter(
        (domain) => domain.age >= min && domain.age <= (max || 999)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "domain":
          return a.domain.localeCompare(b.domain);
        case "age":
          return a.age - b.age;
        default:
          return a.index - b.index;
      }
    });

    setFilteredDomains(filtered);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleScrapeData = async () => {
    if (!selectedSource || !selectedType) {
      setError("Vui lòng chọn source và loại trang muốn thu thập");
      return;
    }

    setIsScrapingData(true);
    setScrapingStatus(`Đang thu thập dữ liệu từ ${selectedSource}...`);

    try {
      const response = await axios.get("http://localhost:5001/scrape-domains", {
        params: {
          source: selectedSource,
          type: selectedType
        },
        timeout: 300000,
      });

      if (response.data && response.data.success && response.data.domains) {
        setScrapingStatus("Đang lưu dữ liệu vào database...");

        const batch = [];
        response.data.domains.forEach((domain, index) => {
          batch.push(
            addDoc(collection(db, "domains"), {
              ...domain,
              createdAt: new Date(),
              status: "active",
              auctionStatus: selectedType === "auction-live" ? "live" : "closed"
            })
          );
        });

        await Promise.all(batch);
        setScrapingStatus(
          `Thu thập thành công ${response.data.domains.length} domain!`
        );
        
        await fetchDomains(viewType);
      }
    } catch (error) {
      console.error("Lỗi khi scrape dữ liệu:", error);

      if (error.code === "ECONNREFUSED") {
        setScrapingStatus(
          "Không thể kết nối đến server. Vui lòng kiểm tra xem server backend đã được khởi động chưa!"
        );
      } else if (error.code === "ETIMEDOUT") {
        setScrapingStatus(
          "Quá trình thu thập dữ liệu mất quá nhiều thời gian. Vui lòng thử lại!"
        );
      } else if (error.response) {
        setScrapingStatus(
          `Lỗi từ server: ${
            error.response.data.message || error.response.statusText
          }`
        );
      } else {
        setScrapingStatus(`Lỗi khi thu thập dữ liệu: ${error.message}`);
      }
    } finally {
      setIsScrapingData(false);
    }
  };

  const handleDeleteDomain = async (id) => {
    try {
      await deleteDoc(doc(db, "domains", id));
      setDomains(domains.filter((domain) => domain.id !== id));
      setFilteredDomains(filteredDomains.filter((domain) => domain.id !== id));
    } catch (error) {
      console.error("Lỗi khi xóa domain:", error);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const domainRef = doc(db, "domains", id);
      await updateDoc(domainRef, { status: newStatus });
      setDomains(
        domains.map((domain) =>
          domain.id === id ? { ...domain, status: newStatus } : domain
        )
      );
      setFilteredDomains(
        filteredDomains.map((domain) =>
          domain.id === id ? { ...domain, status: newStatus } : domain
        )
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error);
    }
  };

  const TableRowContent = ({ domain, index }) => (
    <TableRow
      sx={{
        "&:nth-of-type(odd)": {
          backgroundColor: "#F8FAFC",
        },
        "&:hover": {
          backgroundColor: "#E0F2FE",
          transform: "scale(1.01)",
          transition: "all 0.2s ease-in-out",
        },
      }}
    >
      <TableCell sx={{ padding: "16px 24px" }}>
        {page * rowsPerPage + index + 1}
      </TableCell>
      <TableCell sx={{ padding: "16px 24px" }}>
        <Typography
          component="a"
          href={domain.auctionUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: "#0EA5E9",
            fontWeight: "600",
            fontSize: "0.875rem",
            textDecoration: "none",
            "&:hover": {
              color: "#0369A1",
              textDecoration: "underline",
            },
          }}
        >
          {domain.domain}
        </Typography>
      </TableCell>
      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
        {domain.age} năm
      </TableCell>
      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
        {domain.source}
      </TableCell>
      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
        {domain.endDate}
      </TableCell>
      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
        {domain.createdAt}
      </TableCell>
      <TableCell>
        <Tooltip title="Xóa domain">
          <IconButton onClick={() => handleDeleteDomain(domain.id)}>
            <DeleteIcon sx={{ color: "#EF4444" }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Cập nhật trạng thái">
          <IconButton
            onClick={() =>
              handleUpdateStatus(
                domain.id,
                domain.status === "active" ? "inactive" : "active"
              )
            }
          >
            <EditIcon sx={{ color: "#10B981" }} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
        gap={2}
        sx={{ background: "linear-gradient(135deg, #E0F2FE 0%, #FFFFFF 100%)" }}
      >
        <CircularProgress size={60} thickness={4} sx={{ color: "#0EA5E9" }} />
        <Typography
          variant="h6"
          sx={{
            color: "#0EA5E9",
            fontWeight: "600",
            textShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          Đang tải dữ liệu...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box
        sx={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: { xs: "16px", sm: "24px", md: "32px" },
          background: "linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)",
          borderRadius: "24px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: "20px",
            backgroundColor: "white",
            overflow: "hidden",
            border: "1px solid #E0F2FE",
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 2, md: 0 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                background: "linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)",
                padding: "16px 32px",
                borderRadius: "16px",
                boxShadow: "0 4px 6px -1px rgba(14, 165, 233, 0.2)",
                transform: "rotate(-1deg)",
              }}
            >
              <RocketLaunchIcon
                sx={{
                  fontSize: { xs: 32, sm: 40 },
                  color: "#FFFFFF",
                  animation: "pulse 2s infinite",
                  "@keyframes pulse": {
                    "0%": {
                      transform: "scale(1)",
                    },
                    "50%": {
                      transform: "scale(1.1)",
                    },
                    "100%": {
                      transform: "scale(1)",
                    },
                  },
                }}
              />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  color: "#FFFFFF",
                  fontWeight: "800",
                  fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                  textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                Domain Explorer
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Tooltip title="Thu thập dữ liệu mới">
                <IconButton
                  onClick={handleScrapeData}
                  disabled={isScrapingData}
                  sx={{
                    backgroundColor: "#F0F9FF",
                    width: "48px",
                    height: "48px",
                    "&:hover": {
                      backgroundColor: "#E0F2FE",
                      transform: "scale(1.1)",
                    },
                    "&:disabled": {
                      backgroundColor: "#E2E8F0",
                    },
                  }}
                >
                  {isScrapingData ? (
                    <CircularProgress size={24} sx={{ color: "#0EA5E9" }} />
                  ) : (
                    <RocketLaunchIcon
                      sx={{ color: "#0EA5E9", fontSize: "24px" }}
                    />
                  )}
                </IconButton>
              </Tooltip>

              <Tooltip title="Làm mới dữ liệu">
                <IconButton
                  onClick={fetchDomains}
                  sx={{
                    backgroundColor: "#F0F9FF",
                    width: "48px",
                    height: "48px",
                    "&:hover": {
                      backgroundColor: "#E0F2FE",
                      transform: "scale(1.1) rotate(180deg)",
                      transition: "all 0.3s ease-in-out",
                    },
                  }}
                >
                  <RefreshIcon sx={{ color: "#0EA5E9", fontSize: "24px" }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Filter Section */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ mb: 3 }}
            alignItems="center"
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Tìm kiếm domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94A3B8" }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: "12px",
                  "&:hover": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#0EA5E9",
                    },
                  },
                },
              }}
            />

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Độ tuổi</InputLabel>
              <Select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                label="Độ tuổi"
                sx={{ borderRadius: "12px" }}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="0-1">0-1 năm</MenuItem>
                <MenuItem value="1-3">1-3 năm</MenuItem>
                <MenuItem value="3-5">3-5 năm</MenuItem>
                <MenuItem value="5">Trên 5 năm</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Sắp xếp</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sắp xếp"
                sx={{ borderRadius: "12px" }}
              >
                <MenuItem value="index">STT</MenuItem>
                <MenuItem value="domain">Tên domain</MenuItem>
                <MenuItem value="age">Độ tuổi</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Source Selection */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Xem danh sách</InputLabel>
              <Select
                value={viewType}
                onChange={(e) => {
                  setViewType(e.target.value);
                  fetchDomains(e.target.value);
                }}
                label="Xem danh sách"
              >
                <MenuItem value="all">Tất cả domain</MenuItem>
                <MenuItem value="live">Đang đấu giá</MenuItem>
                <MenuItem value="closed">Đã kết thúc</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Chọn nguồn</InputLabel>
              <Select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setSelectedType("");
                }}
                label="Chọn nguồn"
              >
                {sources.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    {source.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }} disabled={!selectedSource}>
              <InputLabel>Chọn loại trang</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                label="Chọn loại trang"
              >
                {selectedSource &&
                  sources
                    .find((s) => s.id === selectedSource)
                    ?.types.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
              </Select>
            </FormControl>
          </Stack>

          {error && (
            <Alert
              severity="error"
              sx={{
                marginBottom: 3,
                borderRadius: "12px",
              }}
            >
              {error}
            </Alert>
          )}

          {scrapingStatus && (
            <Alert
              severity={
                scrapingStatus.includes("thành công") ? "success" : "info"
              }
              sx={{
                marginBottom: 3,
                borderRadius: "12px",
                animation: "fadeOut 3s forwards",
                "@keyframes fadeOut": {
                  "0%": { opacity: 1 },
                  "70%": { opacity: 1 },
                  "100%": { opacity: 0 },
                },
              }}
              onAnimationEnd={() => setScrapingStatus(null)}
            >
              {scrapingStatus}
            </Alert>
          )}

          {/* Table Section */}
          <TableContainer
            sx={{
              borderRadius: "16px",
              border: "1px solid #E0F2FE",
              overflow: "hidden",
              mb: 2,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Table sx={{ minWidth: { xs: 350, sm: 650 } }}>
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      "linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)",
                  }}
                >
                  <TableCell
                    sx={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                    }}
                  >
                    STT
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                    }}
                  >
                    Tên Domain
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                      display: { xs: "none", sm: "table-cell" },
                    }}
                  >
                    Độ Tuổi
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                      display: { xs: "none", md: "table-cell" },
                    }}
                  >
                    Site Gốc
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                      display: { xs: "none", md: "table-cell" },
                    }}
                  >
                    Ngày kết thúc
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                      display: { xs: "none", md: "table-cell" },
                    }}
                  >
                    Thời gian thu thập
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                    }}
                  >
                    Tác vụ
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDomains.length > 0 ? (
                  filteredDomains
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((domain, index) => (
                      <TableRowContent
                        key={domain.id}
                        domain={domain}
                        index={index}
                      />
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Typography
                        variant="body1"
                        sx={{ color: "#64748B", fontWeight: "500" }}
                      >
                        Không tìm thấy domain nào
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 20, 50]}
              component="div"
              count={filteredDomains.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{
                borderTop: "1px solid #E0F2FE",
                ".MuiTablePagination-select": {
                  color: "#64748B",
                },
                ".MuiTablePagination-displayedRows": {
                  color: "#64748B",
                },
                padding: "8px 16px",
              }}
              labelRowsPerPage={isMobile ? "Hiển thị:" : "Số dòng mỗi trang:"}
            />
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default CloneDomain;
