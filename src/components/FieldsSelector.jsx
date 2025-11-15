// src/components/FieldsSelector.jsx
import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Checkbox, FormControlLabel, Button, Divider } from "@mui/material";

export default function FieldsSelector({ fields = [], selected = [], setSelected = () => {}, papers = [] }) {
  const all = Array.isArray(fields) ? fields : [];

  const toggle = (f) => {
    if (!f) return;
    if (selected.includes(f)) {
      setSelected(selected.filter(s => s !== f));
    } else {
      setSelected([...selected, f]);
    }
  };

  const selectAll = () => setSelected(all.slice());
  const clearAll = () => setSelected([]);

  return (
    <Box sx={{ p: 2, borderRadius: 2, background: "background.paper" }}>
      <Typography variant="h6" sx={{ mb: 1, fontSize: 16 }}>Lọc chuyên ngành</Typography>
      <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
        Chọn các chuyên ngành (từ api_fieldsOfStudy). Mặc định chọn tất cả.
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <Button size="small" onClick={selectAll}>Chọn tất cả</Button>
        <Button size="small" onClick={clearAll}>Bỏ chọn</Button>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ maxHeight: 380, overflow: "auto" }}>
        {all.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>Không có chuyên ngành trong dữ liệu.</Typography>
        ) : all.map(f => (
          <Box key={f} sx={{ display: "flex", alignItems: "center" }}>
            <FormControlLabel
              control={<Checkbox checked={selected.includes(f)} onChange={() => toggle(f)} size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: 14 }}>{f}</Typography>}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

FieldsSelector.propTypes = {
  fields: PropTypes.array,
  selected: PropTypes.array,
  setSelected: PropTypes.func,
  papers: PropTypes.array
};
