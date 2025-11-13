// // src/components/FieldsSelector.jsx
// import React, { useMemo } from "react";
// import PropTypes from "prop-types";
// import {
//   Box,
//   Typography,
//   FormControlLabel,
//   Checkbox,
//   Button,
//   Divider,
//   Chip
// } from "@mui/material";

// export default function FieldsSelector({ fields = [], selected = [], setSelected, papers = null }) {
//   const counts = useMemo(() => {
//     const c = {};
//     if (papers && Array.isArray(papers)) {
//       papers.forEach((p) => {
//         const raw = p.field ?? p.fields ?? null;
//         if (!raw) return;
//         const key = Array.isArray(raw) ? (raw[0] ?? "") : raw;
//         if (typeof key === "string" && key.trim()) {
//           c[key.trim()] = (c[key.trim()] || 0) + 1;
//         }
//       });
//     }
//     return c;
//   }, [papers]);

//   const toggleField = (field) => {
//     if (selected.includes(field)) setSelected(selected.filter((f) => f !== field));
//     else setSelected([...selected, field]);
//   };

//   const selectAll = () => setSelected([...fields]);
//   const clearAll = () => setSelected([]);

//   return (
//     <Box
//       sx={{
//         width: 200,
//         p: 2,
//         border: "1px solid rgba(255,255,255,0.06)",
//         borderRadius: 2,
//         bgcolor: "background.paper",
//       }}
//     >
//       <Typography variant="h6" sx={{ mb: 1, fontWeight: 500, color: "text.primary" }}>
//         Chọn chuyên ngành
//       </Typography>

//       <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
//         <Button size="small" onClick={selectAll} variant="outlined">Chọn tất cả</Button>
//         <Button size="small" onClick={clearAll} variant="text">Bỏ chọn</Button>
//       </Box>

//       <Divider sx={{ mb: 1, borderColor: "rgba(255,255,255,0.04)" }} />

//       <Box sx={{ pr: 1 }}>
//         {fields.length === 0 ? (
//           <Typography variant="body2" color="text.secondary">Không có ngành nào.</Typography>
//         ) : (
//           fields.map((f) => (
//             <Box key={f} sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
//               <FormControlLabel
//                 control={<Checkbox checked={selected.includes(f)} onChange={() => toggleField(f)} size="small" />}
//                 label={<Typography variant="body2" sx={{ mr: 1, color: "text.primary" }}>{f}</Typography>}
//                 sx={{ flex: 1, m: 0 }}
//               />
//               {counts[f] ? <Chip label={counts[f]} size="small" sx={{ ml: 1 }} /> : null}
//             </Box>
//           ))
//         )}
//       </Box>

//       <Divider sx={{ mt: 1, borderColor: "rgba(255,255,255,0.04)" }} />
//       <Typography variant="caption" sx={{ color: "text.secondary", mt: 1, display: "block" }}>
//         Chọn ngành để lọc kết quả xếp hạng. Hệ thống chỉ tính đóng góp từ các bài viết thuộc ngành được chọn.
//       </Typography>
//     </Box>
//   );
// }

// FieldsSelector.propTypes = {
//   fields: PropTypes.arrayOf(PropTypes.string),
//   selected: PropTypes.arrayOf(PropTypes.string),
//   setSelected: PropTypes.func,
//   papers: PropTypes.array,
// };

// src/components/FieldsSelector.jsx
import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Checkbox, FormControlLabel, Button } from "@mui/material";

export default function FieldsSelector({ fields = [], selected = [], setSelected = () => {}, papers = [] }) {
  const allSelected = fields.length > 0 && selected.length === fields.length;

  const toggleField = (f) => {
    if (selected.includes(f)) setSelected(selected.filter(x => x !== f));
    else setSelected([...selected, f]);
  };

  const clearAll = () => setSelected([]);
  const selectAll = () => setSelected([...fields]);

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, color: "text.primary" }}>Lọc theo chuyên ngành</Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <Button size="small" variant="outlined" onClick={selectAll}>Chọn tất cả</Button>
        <Button size="small" variant="outlined" onClick={clearAll}>Bỏ chọn</Button>
      </Box>

      <Box sx={{ maxHeight: 420, overflow: "auto", pr: 1 }}>
        {fields.map(f => (
          <Box key={f} sx={{ mb: 0.5 }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={selected.includes(f)} onChange={() => toggleField(f)} />}
              label={<Typography variant="body2" sx={{ color: "text.primary" }}>{f}</Typography>}
            />
          </Box>
        ))}
        {fields.length === 0 && <Typography variant="body2" color="text.secondary">Không tìm thấy chuyên ngành.</Typography>}
      </Box>
    </Box>
  );
}

FieldsSelector.propTypes = {
  fields: PropTypes.arrayOf(PropTypes.string),
  selected: PropTypes.arrayOf(PropTypes.string),
  setSelected: PropTypes.func,
  papers: PropTypes.array
};
