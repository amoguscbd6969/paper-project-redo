// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Container, Typography, Box, Dialog, DialogContent, DialogActions,
  Button, IconButton, Table as MuiTable, TableBody as MuiTableBody,
  TableCell as MuiTableCell, TableHead as MuiTableHead, TableRow as MuiTableRow,
  Grid
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import RankingTable from "./components/RankingTable";
import ChartComponent from "./components/ChartComponent";
import FieldsSelector from "./components/FieldsSelector";

import papersData from "./data/papers_authors.json";
import authorsData from "./data/authors_universities.json";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    background: { default: "#f9fafb", paper: "#ffffff" },
    text: { primary: "#1e293b", secondary: "#64748b" },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, system-ui, Avenir, "Helvetica Neue", Arial',
    fontSize: 15,
    h4: { fontWeight: 500, fontSize: "1.8rem" },
    button: { textTransform: "none" },
  },
});

export default function App() {
  // 1) unique fields (support field or fields)
  const uniqueFields = useMemo(() => {
    const s = new Set();
    (Array.isArray(papersData) ? papersData : []).forEach((p) => {
      if (!p) return;
      const raw = p.field ?? p.fields ?? null;
      if (!raw) return;
      if (typeof raw === "string" && raw.trim()) s.add(raw.trim());
      else if (Array.isArray(raw)) raw.forEach(v => { if (typeof v === "string" && v.trim()) s.add(v.trim()); });
    });
    return Array.from(s).sort();
  }, []);

  // 2) selected fields default = all detected
  const [selectedFields, setSelectedFields] = useState([]);
  useEffect(() => {
    if (uniqueFields.length > 0) setSelectedFields(uniqueFields.slice());
    else setSelectedFields([]);
  }, [uniqueFields]);

  // 3) ranking + author-by-university + uni-field contributions
  const [ranking, setRanking] = useState([]);
  const [authorsByUniversity, setAuthorsByUniversity] = useState({});
  const [uniFieldContrib, setUniFieldContrib] = useState({}); // uni -> { field -> contrib }
  const [selectedUni, setSelectedUni] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const authorToUniversityMap = new Map();
    (Array.isArray(authorsData) ? authorsData : []).forEach((i) => {
      if (i && i.author && i.university) authorToUniversityMap.set(i.author, i.university);
    });

    const uniContrib = {};
    const uniPapers = {};
    const uniAuthorContrib = {};
    const uniFieldC = {}; // uni -> field -> contrib

    (Array.isArray(papersData) ? papersData : []).forEach((paper) => {
      if (!paper) return;
      const rawField = paper.field ?? paper.fields ?? null;
      let field = null;
      if (typeof rawField === "string") field = rawField.trim();
      else if (Array.isArray(rawField) && rawField[0]) field = rawField[0].trim();

      // filter by selected fields
      if (selectedFields.length > 0 && (!field || !selectedFields.includes(field))) return;

      const authors = Array.isArray(paper.authors) ? paper.authors : [];
      if (authors.length === 0) return;
      const per = 1 / authors.length;
      const seen = new Set();

      authors.forEach((a) => {
        const u = authorToUniversityMap.get(a);
        if (!u) return;
        if (!seen.has(u)) {
          seen.add(u);
          uniPapers[u] = (uniPapers[u] || 0) + 1;
        }
        uniContrib[u] = (uniContrib[u] || 0) + per;
        uniAuthorContrib[u] = uniAuthorContrib[u] || {};
        uniAuthorContrib[u][a] = (uniAuthorContrib[u][a] || 0) + per;

        // per-field contrib accumulation (for this uni)
        if (field) {
          uniFieldC[u] = uniFieldC[u] || {};
          uniFieldC[u][field] = (uniFieldC[u][field] || 0) + per;
        }
      });
    });

    const sorted = Object.keys(uniContrib)
      .map((u) => ({
        university: u,
        totalContribution: uniContrib[u],
        paperCount: uniPapers[u] || 0,
        authorCount: Object.keys(uniAuthorContrib[u] || {}).length,
      }))
      .sort((a, b) => b.totalContribution - a.totalContribution);

    const authorsByUni = {};
    Object.keys(uniAuthorContrib).forEach((u) => {
      const map = uniAuthorContrib[u];
      const total = uniContrib[u] || 0;
      authorsByUni[u] = Object.entries(map)
        .map(([author, contrib]) => ({
          author,
          contribution: contrib,
          percent: total > 0 ? contrib / total : 0,
        }))
        .sort((a, b) => b.contribution - a.contribution);
    });

    setRanking(sorted);
    setAuthorsByUniversity(authorsByUni);
    setUniFieldContrib(uniFieldC);
  }, [selectedFields]);

  // dialog helper
  const openAuthors = (uni) => { setSelectedUni(uni); setOpen(true); };
  const closeAuthors = () => { setOpen(false); setSelectedUni(null); };
  const authorsForSelected = selectedUni ? (authorsByUniversity[selectedUni] || []) : [];

  // helper to build field table rows for selected uni (sorted desc by contrib)
  const fieldRowsForUni = (uni) => {
    const map = uniFieldContrib[uni] || {};
    const total = Object.values(map).reduce((s, x) => s + (Number(x) || 0), 0);
    const rows = Object.keys(map).map(f => ({ field: f, contribution: map[f] }));
    rows.sort((a, b) => b.contribution - a.contribution);
    return { rows, total };
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" align="center" sx={{ fontWeight: 500, color: "text.primary" }}>
            Bảng xếp hạng đóng góp nghiên cứu của các trường đại học Việt Nam
          </Typography>

          <Grid
            container
            spacing={3}
            sx={{
              mt: 3,
              flexWrap: { xs: "wrap", md: "nowrap" },
              alignItems: "flex-start",
            }}
          >
            {/* left column: selector (200px) */}
            <Grid
              item
              xs={12}
              md="auto"
              sx={{
                width: { xs: "100%", md: 200 },
                flexShrink: 0,
                position: "relative",
                alignSelf: "flex-start",
              }}
            >
              <FieldsSelector
                fields={uniqueFields}
                selected={selectedFields}
                setSelected={setSelectedFields}
                papers={papersData}
              />
            </Grid>

            {/* right column: chart + ranking */}
            <Grid item xs={12} md sx={{ minWidth: 0 }}>
              <Box>
                <ChartComponent data={ranking} pageSize={10} onUniversityClick={openAuthors} />
                <RankingTable data={ranking} authorsByUniversity={authorsByUniversity} onUniversityClick={openAuthors} />
              </Box>
            </Grid>
          </Grid>

          {/* Authors dialog: authors table + per-field contribution table */}
          <Dialog fullScreen open={open} onClose={closeAuthors} PaperProps={{ sx: { bgcolor: "#f9fafb", boxShadow: "none" } }}>
            <Box sx={{ display: "flex", alignItems: "center", p: 2 }}>
              <IconButton onClick={closeAuthors}><Typography sx={{ fontSize: 22 }}>←</Typography></IconButton>
              <Box sx={{ ml: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {selectedUni ? `Danh sách tác giả – ${selectedUni}` : "Danh sách tác giả"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Sắp xếp theo mức đóng góp giảm dần</Typography>
              </Box>
            </Box>

            <DialogContent sx={{ background: "#ffffff", p: { xs: 2, md: 4 } }}>
              {/* Authors table */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Tác giả</Typography>
                {authorsForSelected.length === 0 ? (
                  <Typography>Không tìm thấy tác giả cho trường này.</Typography>
                ) : (
                  <MuiTable size="small" sx={{ mb: 2 }}>
                    <MuiTableHead>
                      <MuiTableRow>
                        <MuiTableCell>#</MuiTableCell>
                        <MuiTableCell>Tác giả</MuiTableCell>
                        <MuiTableCell align="right">Đóng góp</MuiTableCell>
                        <MuiTableCell align="right">Tỉ lệ % (trong trường)</MuiTableCell>
                      </MuiTableRow>
                    </MuiTableHead>
                    <MuiTableBody>
                      {authorsForSelected.map((a, i) => (
                        <MuiTableRow key={a.author ?? i}>
                          <MuiTableCell>{i + 1}</MuiTableCell>
                          <MuiTableCell sx={{ maxWidth: 400 }}>{a.author}</MuiTableCell>
                          <MuiTableCell align="right">{Number(a.contribution ?? 0).toFixed(4)}</MuiTableCell>
                          <MuiTableCell align="right">{((a.percent ?? 0) * 100).toFixed(1)}%</MuiTableCell>
                        </MuiTableRow>
                      ))}
                      {/* TOTAL row for authors table (sum of contributions shown) */}
                      <MuiTableRow>
                        <MuiTableCell />
                        <MuiTableCell sx={{ fontWeight: 700 }}>TỔNG</MuiTableCell>
                        <MuiTableCell align="right" sx={{ fontWeight: 700 }}>
                          {(authorsForSelected.reduce((s, x) => s + (Number(x.contribution) || 0), 0)).toFixed(4)}
                        </MuiTableCell>
                        <MuiTableCell />
                      </MuiTableRow>
                    </MuiTableBody>
                  </MuiTable>
                )}
              </Box>

              {/* Field contribution table for this university */}
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Đóng góp theo chuyên ngành (trường này)</Typography>
                {selectedUni ? (() => {
                  const { rows, total } = fieldRowsForUni(selectedUni);
                  if (rows.length === 0) {
                    return <Typography>Không có đóng góp theo chuyên ngành trong phạm vi lựa chọn.</Typography>;
                  }
                  return (
                    <MuiTable size="small">
                      <MuiTableHead>
                        <MuiTableRow>
                          <MuiTableCell>Chuyên ngành</MuiTableCell>
                          <MuiTableCell align="right">Đóng góp</MuiTableCell>
                          <MuiTableCell align="right">Tỉ lệ % (so với tổng trường)</MuiTableCell>
                        </MuiTableRow>
                      </MuiTableHead>
                      <MuiTableBody>
                        {rows.map((r, i) => (
                          <MuiTableRow key={r.field ?? i}>
                            <MuiTableCell>{r.field}</MuiTableCell>
                            <MuiTableCell align="right">{Number(r.contribution ?? 0).toFixed(4)}</MuiTableCell>
                            <MuiTableCell align="right">{total > 0 ? ((r.contribution / total) * 100).toFixed(1) : "0.0"}%</MuiTableCell>
                          </MuiTableRow>
                        ))}
                        {/* TOTAL */}
                        <MuiTableRow>
                          <MuiTableCell sx={{ fontWeight: 700 }}>TỔNG</MuiTableCell>
                          <MuiTableCell align="right" sx={{ fontWeight: 700 }}>{Number(total).toFixed(4)}</MuiTableCell>
                          <MuiTableCell align="right" sx={{ fontWeight: 700 }}>{total > 0 ? "100.0%" : "0.0%"}</MuiTableCell>
                        </MuiTableRow>
                      </MuiTableBody>
                    </MuiTable>
                  );
                })() : null}
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
              <Button onClick={closeAuthors}>Đóng</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
