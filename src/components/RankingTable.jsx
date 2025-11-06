// src/components/RankingTable.jsx
import React from "react";
import PropTypes from "prop-types";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Button
} from "@mui/material";

export default function RankingTable({ data = [], authorsByUniversity = {}, onUniversityClick = () => {} }) {
  const rows = Array.isArray(data) ? data : [];

  const pageSize = 100;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const [page, setPage] = React.useState(0);

  const pageRows = rows.slice(page * pageSize, page * pageSize + pageSize);

  const goTo = (p) => {
    if (p < 0) p = 0;
    if (p >= totalPages) p = totalPages - 1;
    setPage(p);
    const el = document.querySelector("#ranking-table");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderPageLinks = () => {
    const visible = 5;
    const start = Math.max(0, page - Math.floor(visible / 2));
    let end = Math.min(totalPages - 1, start + visible - 1);
    const newStart = Math.max(0, end - (visible - 1));
    const finalStart = newStart;
    const links = [];
    for (let i = finalStart; i <= end; i++) links.push(i);

    return (
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Button size="small" onClick={() => goTo(0)} disabled={page === 0} variant="outlined">{"<<"}</Button>
        {finalStart > 0 && <Button size="small" onClick={() => goTo(0)}>{1}</Button>}
        {finalStart > 1 && <Typography variant="body2">...</Typography>}
        {links.map((p) => (
          <Button key={p} size="small" onClick={() => goTo(p)} variant={p === page ? "contained" : "text"}>{p + 1}</Button>
        ))}
        {end < totalPages - 2 && <Typography variant="body2">...</Typography>}
        {end < totalPages - 1 && <Button size="small" onClick={() => goTo(totalPages - 1)}>{totalPages}</Button>}
        <Button size="small" onClick={() => goTo(totalPages - 1)} disabled={page === totalPages - 1} variant="outlined">{">>"}</Button>
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 3 }} id="ranking-table">
      <Typography variant="h5" sx={{ mb: 1, fontSize: 20, fontWeight: 400 }}>
        Bảng xếp hạng các trường
      </Typography>

      <TableContainer component={Paper} elevation={3} sx={{ width: "100%" }}>
        <Table size="medium" aria-label="bảng xếp hạng" sx={{ fontSize: 16 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 680, fontSize: 15 }}>Thứ hạng</TableCell>
              <TableCell sx={{ fontWeight: 680, fontSize: 15 }}>Trường</TableCell>
              <TableCell align="right" sx={{ fontWeight: 680, fontSize: 15 }}>Tổng đóng góp</TableCell>
              <TableCell align="right" sx={{ fontWeight: 680, fontSize: 15 }}>Số bài viết</TableCell>
              <TableCell align="right" sx={{ fontWeight: 680, fontSize: 15 }}>Số tác giả</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {pageRows.map((row, idx) => {
              const uniqueAuthors = authorsByUniversity[row.university] ? authorsByUniversity[row.university].length : 0;
              return (
                <TableRow key={row.university ?? idx} hover>
                  <TableCell sx={{ fontSize: 15 }}>{page * pageSize + idx + 1}</TableCell>

                  <TableCell sx={{ maxWidth: 720 }}>
                    <Button
                      onClick={() => onUniversityClick(row.university)}
                      variant="text"
                      size="small"
                      sx={{ textTransform: "none", justifyContent: "flex-start", padding: 0 }}
                    >
                      <Typography variant="body1" title={row.university} sx={{ fontSize: 16, fontWeight: 400 }}>
                        {row.university}
                      </Typography>
                    </Button>
                  </TableCell>

                  <TableCell align="right" sx={{ fontSize: 15 }}>{Number(row.totalContribution ?? 0).toFixed(4)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 15 }}>{row.paperCount ?? 0}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 15 }}>{uniqueAuthors}</TableCell>
                </TableRow>
              );
            })}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">Không có dữ liệu xếp hạng.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          {renderPageLinks()}
        </Box>
      </TableContainer>
    </Box>
  );
}

RankingTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    university: PropTypes.string,
    totalContribution: PropTypes.number,
    paperCount: PropTypes.number,
    authorCount: PropTypes.number,
  })),
  authorsByUniversity: PropTypes.object,
  onUniversityClick: PropTypes.func,
};
