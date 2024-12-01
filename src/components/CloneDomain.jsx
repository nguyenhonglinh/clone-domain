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
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase-config";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";

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

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    try {
      const domainsQuery = query(
        collection(db, "domain_data"),
        orderBy("index", "asc"),
        limit(100)
      );

      const querySnapshot = await getDocs(domainsQuery);

      if (querySnapshot.empty) {
        setError("Không có dữ liệu domain nào trong database");
        return;
      }

      const domainsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDomains(domainsData);
      setFilteredDomains(domainsData);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu từ Firestore: ", error);
      setError("Không thể kết nối với database. Vui lòng thử lại sau.");
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

  const filterDomains = () => {
    let filtered = [...domains];

    // Tìm kiếm
    if (searchTerm) {
      filtered = filtered.filter(
        (domain) =>
          domain.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          domain.source?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Lọc theo độ tuổi
    if (ageFilter !== "all") {
      const [min, max] = ageFilter.split("-").map(Number);
      filtered = filtered.filter(
        (domain) => domain.age >= min && domain.age <= (max || 999)
      );
    }

    // Sắp xếp
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
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDomains.length > 0 ? (
                  filteredDomains
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((domain, index) => (
                      <TableRow
                        key={domain.id}
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
                        <TableCell
                          sx={{
                            color: "#64748B",
                            padding: "16px 24px",
                            fontWeight: "500",
                          }}
                        >
                          {page * rowsPerPage + index + 1}
                        </TableCell>
                        <TableCell sx={{ padding: "16px 24px" }}>
                          <Typography
                            sx={{
                              color: "#0EA5E9",
                              fontWeight: "600",
                              fontSize: "0.875rem",
                              "&:hover": {
                                color: "#0369A1",
                                cursor: "pointer",
                              },
                            }}
                          >
                            {domain.domain}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#64748B",
                            padding: "16px 24px",
                            display: { xs: "none", sm: "table-cell" },
                            fontWeight: "500",
                          }}
                        >
                          {domain.age} năm
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#64748B",
                            padding: "16px 24px",
                            display: { xs: "none", md: "table-cell" },
                            fontWeight: "500",
                          }}
                        >
                          {domain.source}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
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
