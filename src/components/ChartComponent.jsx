import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button } from "@mui/material";

/* lighter palette so black text inside bar is readable */
const PALETTE = [
  "#A8E6CF", "#A0D8FF", "#FFDDAA", "#D7B6FF", "#FFABAB",
  "#B3B7FF", "#B2F2E6", "#FFD1B3", "#D6C2B8", "#BFD7EA",
  "#F8BBD0", "#BDEAF6", "#E6F4C3", "#FFE082", "#E0E0E0",
  "#C7B4FF", "#F8CFE0", "#DCCAB5", "#D9C9FF", "#B3DAFF"
];

function hashNameToIndex(name) {
  if (!name) return 0;
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % PALETTE.length;
}
function colorForName(name) {
  return PALETTE[hashNameToIndex(name)];
}

function renderPageLinks(currentPage, totalPages, setPage) {
  const visible = 5;
  const start = Math.max(0, currentPage - Math.floor(visible / 2));
  let end = Math.min(totalPages - 1, start + visible - 1);
  const newStart = Math.max(0, end - (visible - 1));
  const finalStart = newStart;
  const pages = [];
  for (let i = finalStart; i <= end; i++) pages.push(i);
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <Button size="small" variant="outlined" onClick={() => setPage(0)} disabled={currentPage === 0}>{"<<"}</Button>
      {finalStart > 0 && <Button size="small" onClick={() => setPage(0)}>{1}</Button>}
      {finalStart > 1 && <Typography variant="body2">...</Typography>}
      {pages.map(p => (
        <Button key={p} size="small" variant={p === currentPage ? "contained" : "text"} onClick={() => setPage(p)}>{p + 1}</Button>
      ))}
      {end < totalPages - 2 && <Typography variant="body2">...</Typography>}
      {end < totalPages - 1 && <Button size="small" onClick={() => setPage(totalPages - 1)}>{totalPages}</Button>}
      <Button size="small" variant="outlined" onClick={() => setPage(totalPages - 1)} disabled={currentPage === totalPages - 1}>{">>"}</Button>
    </Box>
  );
}

export default function ChartComponent({ data = [], pageSize = 10, onUniversityClick = () => {} }) {
  const rowsAll = Array.isArray(data) ? data : [];
  const totalPages = Math.max(1, Math.ceil(rowsAll.length / pageSize));
  const [page, setPage] = useState(0);

  // global max for consistent scaling across pages (so later pages have smaller bars)
  const globalMax = useMemo(() => {
    const vals = rowsAll.map(r => Number(r.totalContribution ?? 0));
    return vals.length ? Math.max(...vals) : 1e-6;
  }, [rowsAll]);

  const startIdx = page * pageSize;
  const pageRows = rowsAll.slice(startIdx, startIdx + pageSize);

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 400, fontSize: { xs: 18, md: 20 } }}>
        Biểu đồ đóng góp — Trang {page + 1}/{totalPages}
      </Typography>

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderRadius: 2, p: 1, background: "background.paper", boxShadow: 1 }}>
            {pageRows.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>Không có dữ liệu để hiển thị</Box>
            ) : pageRows.map((r, idx) => {
              const val = Number(r.totalContribution ?? 0);
              const pctOfGlobal = globalMax > 0 ? (val / globalMax) * 100 : 0;
              const color = colorForName(r.university);

              // decide whether value fits inside bar: if pctOfGlobal >= 20% -> inside; else outside
              const showInside = pctOfGlobal >= 20;

              return (
                <Box key={r.university ?? idx} sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                  <Box sx={{ width: 40, textAlign: "left", fontSize: 15 }}>{startIdx + idx + 1}</Box>

                  {/* label — allow wrap if overlaps */}
                  <Box sx={{ flex: "0 0 36%", pr: 1 }}>
                    <Typography
                      variant="body1"
                      title={r.university}
                      onClick={() => onUniversityClick(r.university)}
                      sx={{
                        fontWeight: 400,
                        fontSize: 15,
                        cursor: "pointer",
                        wordBreak: "break-word",
                        whiteSpace: "normal",
                        maxHeight: 44,
                        lineHeight: 1.1
                      }}
                    >
                      {r.university}
                    </Typography>
                    {typeof r.paperCount === "number" && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>{r.paperCount} bài viết</Typography>
                    )}
                  </Box>

                  {/* bar */}
                  <Box sx={{ flex: 1, px: 1 }}>
                    <Box sx={{ height: 40, borderRadius: 2, background: "#f3f3f3", position: "relative", overflow: "hidden" }}>
                      <Box
                        role="button"
                        onClick={() => onUniversityClick(r.university)}
                        title={`${r.university} — ${val.toFixed(4)} đóng góp`}
                        sx={{
                          height: "100%",
                          width: `${Math.max(1, pctOfGlobal)}%`,
                          maxWidth: "100%",
                          transition: "width 450ms ease",
                          background: color,
                          display: "flex",
                          alignItems: "center",
                          px: 1,
                        }}
                      >
                        {/* value inside bar when enough width */}
                        {showInside ? (
                          <Typography variant="body2" sx={{ color: "#111", fontWeight: 600 }}>
                            {val.toFixed(4)}
                          </Typography>
                        ) : null}
                      </Box>

                      {/* value outside on right when bar too short */}
                      {!showInside && (
                        <Box sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
                          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
                            {val.toFixed(4)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* pagination for chart pages */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            {renderPageLinks(page, totalPages, setPage)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

ChartComponent.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      university: PropTypes.string,
      totalContribution: PropTypes.number,
      paperCount: PropTypes.number
    })
  ),
  pageSize: PropTypes.number,
  onUniversityClick: PropTypes.func
};
