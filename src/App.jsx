// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
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

import rawData from "./data/data.json";

/* Dark theme */
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#4ea8ff" },
    background: { default: "#071016", paper: "#0c1418" },
    text: { primary: "#ffffff", secondary: "#a8b4c3" },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, system-ui, Avenir, "Helvetica Neue", Arial',
    fontSize: 15,
    h4: { fontWeight: 500, fontSize: "1.8rem" },
    button: { textTransform: "none" },
  },
});

/* ---------- Helpers ---------- */
const toPaperArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return Object.values(data);
};

const norm = (s) => (!s && s !== 0 ? null : String(s).replace(/\s+/g, " ").trim());

const normalizeOrg = (s) => {
  if (!s) return null;
  let t = String(s).trim();
  t = t.replace(/\s+/g, " ").replace(/^[,.\-:\s]+|[,.\-:\s]+$/g, "");
  if (t.length === 0) return null;
  t = t.replace(/\s+Vietnam$/i, "");
  if (t.length < 3) return null;
  return t;
};

const looksLikeDept = (s) => s && /^\s*(department|dept|division|section|faculty of)\b/i.test(s);

/* Extract affiliations */
const extractAffiliationsForPaper = (paper) => {
  if (!paper) return [];

  // Use matched_strings as fallback (for beta data)
  if (Array.isArray(paper.matched_strings) && paper.matched_strings.length > 0) {
    return paper.matched_strings.map(m => normalizeOrg(m)).filter(Boolean).filter(x => !looksLikeDept(x));
  }

  // fallback: api_journal or api_venue
  if (paper.api_journal?.name) {
    const n = normalizeOrg(paper.api_journal.name);
    if (n && !looksLikeDept(n)) return [n];
  }
  return [];
};

/* Extract fields from new structure */
const extractFields = (paper) => {
  if (!paper) return [];

  let fields = [];
  if (Array.isArray(paper.fieldsOfStudy)) fields.push(...paper.fieldsOfStudy.map(f => norm(f)).filter(Boolean));
  if (Array.isArray(paper.s2FieldsOfStudy)) {
    fields.push(...paper.s2FieldsOfStudy.map(f => norm(f.category)).filter(Boolean));
  }
  return Array.from(new Set(fields));
};

/* ---------------- App ---------------- */
export default function App() {
  const papers = useMemo(() => toPaperArray(rawData), [rawData]);

  const paperMeta = useMemo(() => {
    return papers.map(p => {
      const id = p.corpusid ?? p.corpusId ?? p.id ?? null;
      const fields = extractFields(p); // array of fields
      const affiliations = extractAffiliationsForPaper(p);
      const title = norm(p.title || p.api_title || "");
      return { id, fields, affiliations, title, raw: p };
    });
  }, [papers]);

  // all unique fields
  const uniqueFields = useMemo(() => {
    const s = new Set();
    paperMeta.forEach(pm => pm.fields.forEach(f => s.add(f)));
    return Array.from(s).sort();
  }, [paperMeta]);

  const [selectedFields, setSelectedFields] = useState([]);
  useEffect(() => setSelectedFields(uniqueFields.slice()), [uniqueFields]);

  const [ranking, setRanking] = useState([]);
  const [authorsByUniversity, setAuthorsByUniversity] = useState({});
  const [uniFieldContrib, setUniFieldContrib] = useState({});
  const [selectedUni, setSelectedUni] = useState(null);
  const [open, setOpen] = useState(false);

  /* compute ranking */
  useEffect(() => {
    const uniContrib = {};
    const uniPaperCount = {};
    const uniAuthorDetail = {};
    const uniFieldMap = {};

    for (const pm of paperMeta) {
      // field filter
      if (selectedFields.length > 0 && pm.fields.length > 0 && !pm.fields.some(f => selectedFields.includes(f))) continue;
      if (selectedFields.length > 0 && pm.fields.length === 0) continue;

      const affs = pm.affiliations || [];
      if (affs.length === 0) continue;

      const perUni = 1 / affs.length;
      const seen = new Set();

      for (const aff of affs) {
        const uni = norm(aff);
        if (!uni || seen.has(uni)) continue;
        seen.add(uni);

        uniContrib[uni] = (uniContrib[uni] || 0) + perUni;
        uniPaperCount[uni] = (uniPaperCount[uni] || 0) + 1;

        if (!uniAuthorDetail[uni]) uniAuthorDetail[uni] = {};
        const pseudoAuthors = pm.raw.api_authors ? pm.raw.api_authors.map(a => norm(a?.name || a)).filter(Boolean) : ["(không rõ tác giả)"];
        for (const pa of pseudoAuthors) {
          const name = norm(pa) || "(không rõ tác giả)";
          uniAuthorDetail[uni][name] = (uniAuthorDetail[uni][name] || 0) + perUni / pseudoAuthors.length;
        }

        // field contribution
        if (!uniFieldMap[uni]) uniFieldMap[uni] = {};
        pm.fields.forEach(f => {
          uniFieldMap[uni][f] = (uniFieldMap[uni][f] || 0) + perUni;
        });
      }
    }

    const sorted = Object.keys(uniContrib).map(u => ({
      university: u,
      totalContribution: uniContrib[u],
      paperCount: uniPaperCount[u] || 0,
      authorCount: Object.keys(uniAuthorDetail[u] || {}).length
    })).sort((a, b) => b.totalContribution - a.totalContribution);

    const authorsByUniObj = {};
    Object.keys(uniAuthorDetail).forEach(u => {
      const map = uniAuthorDetail[u];
      const total = uniContrib[u] || 0;
      authorsByUniObj[u] = Object.entries(map).map(([author, contrib]) => ({
        author,
        contribution: contrib,
        percent: total > 0 ? contrib / total : 0
      })).sort((a, b) => b.contribution - a.contribution);
    });

    setRanking(sorted);
    setAuthorsByUniversity(authorsByUniObj);
    setUniFieldContrib(uniFieldMap);
  }, [paperMeta, selectedFields]);

  const openAuthors = (uni) => { setSelectedUni(uni); setOpen(true); };
  const closeAuthors = () => { setOpen(false); setSelectedUni(null); };
  const authorsForSelected = selectedUni ? (authorsByUniversity[selectedUni] || []) : [];

  const fieldRowsForUni = (uni) => {
    const map = uniFieldContrib[uni] || {};
    const total = Object.values(map).reduce((s, x) => s + (Number(x) || 0), 0);
    const rows = Object.keys(map).map(f => ({ field: f, contribution: map[f] }));
    rows.sort((a, b) => b.contribution - a.contribution);
    return { rows, total };
  };

  const topFieldsForSelected = (n = 5) => {
    if (!selectedUni) return [];
    const map = uniFieldContrib[selectedUni] || {};
    const total = Object.values(map).reduce((s, x) => s + (Number(x) || 0), 0);
    return Object.keys(map).map(f => ({ field: f, contrib: map[f], pct: total > 0 ? (map[f] / total) * 100 : 0 }))
      .sort((a, b) => b.contrib - a.contrib).slice(0, n);
  };

  const sampleFields = uniqueFields.slice(0, 6);
  const sampleUnis = ranking.slice(0, 6).map(r => r.university);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" align="center" sx={{ fontWeight: 500, color: "text.primary" }}>
            Bảng xếp hạng đóng góp nghiên cứu (từ data/data.json)
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Fields (ví dụ): {sampleFields.join(", ")} {uniqueFields.length > sampleFields.length ? "…" : ""}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Universities (ví dụ): {sampleUnis.join(" | ") || "(chưa có)"}
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mt: 3, flexWrap: { xs: "wrap", md: "nowrap" }, alignItems: "flex-start" }}>
            <Grid item xs={12} md="auto" sx={{ width: { xs: "100%", md: 200 }, flexShrink: 0 }}>
              <FieldsSelector fields={uniqueFields} selected={selectedFields} setSelected={setSelectedFields} papers={papers} />
            </Grid>
            <Grid item xs={12} md sx={{ minWidth: 0, pl: { md: 3 } }}>
              <Box>
                <ChartComponent data={ranking} pageSize={10} onUniversityClick={openAuthors} />
                <RankingTable data={ranking} authorsByUniversity={authorsByUniversity} onUniversityClick={openAuthors} />
              </Box>
            </Grid>
          </Grid>

          <Dialog fullScreen open={open} onClose={closeAuthors} PaperProps={{ sx: { bgcolor: "background.paper", boxShadow: "none" } }}>
            <Box sx={{ display: "flex", alignItems: "center", p: 2 }}>
              <IconButton onClick={closeAuthors}><Typography sx={{ fontSize: 22, color: "text.primary" }}>←</Typography></IconButton>
              <Box sx={{ ml: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 500, color: "text.primary" }}>
                  {selectedUni ? `Thông tin trường - ${selectedUni}` : "Thông tin trường"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Danh sách tác giả & đóng góp theo chuyên ngành (sắp xếp giảm dần)
                </Typography>

                {selectedUni && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                      Chuyên ngành (theo đóng góp):
                    </Typography>
                    {topFieldsForSelected(6).map((f, i) => (
                      <Typography key={f.field} variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                        {i + 1}. {f.field} — {f.pct.toFixed(1)}%
                      </Typography>
                    ))}
                    {Object.keys(uniFieldContrib[selectedUni] || {}).length === 0 && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Không có dữ liệu chuyên ngành.</Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>

            <DialogContent sx={{ background: "background.paper", p: { xs: 2, md: 4 } }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 1, color: "text.primary" }}>Tác giả</Typography>
                {authorsForSelected.length === 0 ? (
                  <Typography sx={{ color: "text.secondary" }}>Không tìm thấy tác giả cho trường này.</Typography>
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
                      <MuiTableRow>
                        <MuiTableCell />
                        <MuiTableCell sx={{ fontWeight: 700 }}>TỔNG</MuiTableCell>
                        <MuiTableCell align="right" sx={{ fontWeight: 700 }}>{(authorsForSelected.reduce((s, x) => s + (Number(x.contribution) || 0), 0)).toFixed(4)}</MuiTableCell>
                        <MuiTableCell />
                      </MuiTableRow>
                    </MuiTableBody>
                  </MuiTable>
                )}
              </Box>

              <Box>
                <Typography variant="h6" sx={{ mb: 1, color: "text.primary" }}>Đóng góp theo chuyên ngành (trường này)</Typography>
                {selectedUni ? (() => {
                  const { rows, total } = fieldRowsForUni(selectedUni);
                  if (rows.length === 0) return <Typography sx={{ color: "text.secondary" }}>Không có đóng góp theo chuyên ngành trong phạm vi lựa chọn.</Typography>;
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
