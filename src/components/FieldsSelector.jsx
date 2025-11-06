// src/components/FieldsSelector.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Button,
  Divider,
  Chip
} from "@mui/material";

/**
 * FieldsSelector
 * - fields: array of field names (strings)
 * - selected: array of selected field names
 * - setSelected: setter
 * - papers: optional array of papers to compute counts
 *
 * NOTE: width is fixed to 200px (per your instruction); no internal scrollbar (it will grow with page).
 */
export default function FieldsSelector({ fields = [], selected = [], setSelected, papers = null }) {
  const counts = useMemo(() => {
    const c = {};
    if (papers && Array.isArray(papers)) {
      papers.forEach((p) => {
        const raw = p.field ?? p.fields ?? null;
        if (!raw) return;
        const key = Array.isArray(raw) ? (raw[0] ?? "") : raw;
        if (typeof key === "string" && key.trim()) {
          c[key.trim()] = (c[key.trim()] || 0) + 1;
        }
      });
    }
    return c;
  }, [papers]);

  const toggleField = (field) => {
    if (selected.includes(field)) setSelected(selected.filter((f) => f !== field));
    else setSelected([...selected, field]);
  };

  const selectAll = () => setSelected([...fields]);
  const clearAll = () => setSelected([]);

  return (
    <Box
      sx={{
        width: 190,
        p: 2,
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        bgcolor: "#ffffff",
      }}
    >
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
        Chọn chuyên ngành
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <Button size="small" onClick={selectAll} variant="outlined">Chọn tất cả</Button>
        <Button size="small" onClick={clearAll} variant="text">Bỏ chọn</Button>
      </Box>

      <Divider sx={{ mb: 1 }} />

      {/* No internal scrollbar: render all fields inline on page */}
      <Box sx={{ pr: 1 }}>
        {fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Không có ngành nào.</Typography>
        ) : (
          fields.map((f) => (
            <Box key={f} sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
              <FormControlLabel
                control={<Checkbox checked={selected.includes(f)} onChange={() => toggleField(f)} size="small" />}
                label={<Typography variant="body2" sx={{ mr: 1 }}>{f}</Typography>}
                sx={{ flex: 1, m: 0 }}
              />
              {counts[f] ? <Chip label={counts[f]} size="small" sx={{ ml: 1 }} /> : null}
            </Box>
          ))
        )}
      </Box>

      <Divider sx={{ mt: 1 }} />
      <Typography variant="caption" sx={{ color: "text.secondary", mt: 1, display: "block" }}>
        Chọn ngành để lọc kết quả xếp hạng. Hệ thống chỉ tính đóng góp từ các bài viết thuộc ngành được chọn.
      </Typography>
    </Box>
  );
}

FieldsSelector.propTypes = {
  fields: PropTypes.arrayOf(PropTypes.string),
  selected: PropTypes.arrayOf(PropTypes.string),
  setSelected: PropTypes.func,
  papers: PropTypes.array,
};
