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
} from "@mui/material";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase-config";
import RefreshIcon from "@mui/icons-material/Refresh";
import DnsIcon from "@mui/icons-material/Dns";

const CloneDomain = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20); // Mặc định hiển thị 20 domain

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    try {
      const domainsQuery = query(
        collection(db, "domain_data"),
        orderBy("index", "asc"),
        limit(100) // Giới hạn số lượng document lấy về
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
      >
        <CircularProgress size={60} thickness={4} sx={{ color: "#0EA5E9" }} />
        <Typography variant="h6" sx={{ color: "#0EA5E9" }}>
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
          backgroundColor: "#FFFFFF",
          borderRadius: "24px",
          boxShadow:
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: "20px",
            backgroundColor: "white",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 2, sm: 0 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                background: "linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)",
                padding: "12px 24px",
                borderRadius: "16px",
              }}
            >
              <DnsIcon
                sx={{
                  fontSize: { xs: 32, sm: 40 },
                  color: "#FFFFFF",
                }}
              />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  color: "#FFFFFF",
                  fontWeight: "700",
                  fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                }}
              >
                Domain Manager
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
                    transform: "scale(1.05)",
                    transition: "all 0.2s ease-in-out",
                  },
                }}
              >
                <RefreshIcon sx={{ color: "#0EA5E9", fontSize: "24px" }} />
              </IconButton>
            </Tooltip>
          </Box>

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

          <TableContainer
            sx={{
              borderRadius: "16px",
              border: "1px solid #E0F2FE",
              overflow: "hidden",
              mb: 2,
            }}
          >
            <Table sx={{ minWidth: { xs: 350, sm: 650 } }}>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "#F0F9FF",
                  }}
                >
                  <TableCell
                    sx={{
                      color: "#0369A1",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                    }}
                  >
                    STT
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#0369A1",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      padding: "16px 24px",
                    }}
                  >
                    Tên Domain
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#0369A1",
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
                      color: "#0369A1",
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
                {domains.length > 0 ? (
                  domains
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((domain) => (
                      <TableRow
                        key={domain.id}
                        sx={{
                          "&:hover": {
                            backgroundColor: "#F0F9FF",
                            transition: "all 0.2s ease-in-out",
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            color: "#64748B",
                            padding: "16px 24px",
                          }}
                        >
                          {domain.index}
                        </TableCell>
                        <TableCell sx={{ padding: "16px 24px" }}>
                          <Typography
                            sx={{
                              color: "#0EA5E9",
                              fontWeight: "500",
                              fontSize: "0.875rem",
                              "&:hover": {
                                color: "#0369A1",
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
                          }}
                        >
                          {domain.age} năm
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#64748B",
                            padding: "16px 24px",
                            display: { xs: "none", md: "table-cell" },
                          }}
                        >
                          {domain.source}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" sx={{ color: "#64748B" }}>
                        Chưa có dữ liệu domain
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 20, 50]}
              component="div"
              count={domains.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
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
