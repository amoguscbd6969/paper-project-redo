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
  return Object.values(data);
};

const norm = (s) => {
  if (!s && s !== 0) return null;
  return String(s).replace(/\s+/g, " ").trim();
};

/* ---- EXTRACT FIELDS: ONLY from api_fieldsOfStudy ---- */
const extractField = (paper) => {
  if (!paper) return null;
  if (Array.isArray(paper.api_fieldsOfStudy) && paper.api_fieldsOfStudy.length) {
    const f = paper.api_fieldsOfStudy[0];
    if (f) return norm(f);
  }
  return null;
};

/* Normalize university/org name (simple heuristics) */
const normalizeUniversityName = (s) => {
  if (!s) return null;
  let t = String(s).trim();
  t = t.replace(/([a-z])([A-Z][a-z]{2,})$/u, "$1, $2");
  t = t.replace(/\s+/g, " ").replace(/,\s*/g, ", ").replace(/\s+,/g, ",").trim();
  t = t.replace(/^[,.\-:\s]+|[,.\-:\s]+$/g, "");
  return t || null;
};

const parseAffiliationBlock = (text) => {
  if (!text || typeof text !== "string") return null;
  const parts = text.split(/\n|;|,|\(|\)|\u2014/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const strongRe = /\b(university|universit|univ|college|institute|hospital|school|faculty|centre|center|academy|research|clinic)\b/i;
  const uniRe = /\b(university|univ)\b/i;
  for (const p of parts) {
    if (uniRe.test(p)) return normalizeUniversityName(p);
  }
  for (const p of parts) {
    if (strongRe.test(p)) {
      if (/^\s*(department|dept|division|section)\b/i.test(p) && !uniRe.test(p)) continue;
      return normalizeUniversityName(p);
    }
  }
  const candidates = parts.filter(p => {
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length < 3) return false;
    if (/^\s*(department|dept|division|section|table|figure)\b/i.test(p)) return false;
    return true;
  });
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.length - a.length);
    return normalizeUniversityName(candidates[0]);
  }
  const last = parts[parts.length - 1];
  if (last && last.split(/\s+/).filter(Boolean).length >= 2 && !/^\s*(department|dept)\b/i.test(last)) {
    return normalizeUniversityName(last);
  }
  return null;
};

const buildAuthors = (paper) => {
  if (!paper) return [];
  const ann = paper.content?.annotations ?? {};
  const out = [];

  if (Array.isArray(paper.api_authors) && paper.api_authors.length > 0) {
    const names = paper.api_authors.map(a => norm(a?.name || a) || "Unknown");
    const affArr = Array.isArray(ann.authoraffiliation) ? ann.authoraffiliation : [];
    if (affArr.length >= names.length) {
      for (let i = 0; i < names.length; i++) {
        const aff = parseAffiliationBlock(String(affArr[i] || ""));
        out.push({ name: names[i], affiliation: aff });
      }
      return out;
    }
    for (const n of names) out.push({ name: n, affiliation: null });
    return out;
  }

  if (Array.isArray(ann.author) && ann.author.length > 0) {
    const affArr = Array.isArray(ann.authoraffiliation) ? ann.authoraffiliation : [];
    if (affArr.length >= ann.author.length) {
      for (let i = 0; i < ann.author.length; i++) {
        const raw = String(ann.author[i] || "");
        const nameLine = raw.split(/\n/)[0].trim();
        const name = norm(nameLine) || "Unknown";
        const aff = parseAffiliationBlock(String(affArr[i] || ""));
        out.push({ name, affiliation: aff });
      }
      return out;
    }
    for (let i = 0; i < ann.author.length; i++) {
      const raw = String(ann.author[i] || "");
      const lines = raw.split(/\n/).map(l => l.trim()).filter(Boolean);
      const name = norm(lines[0] || "") || "Unknown";
      const rest = lines.slice(1).join(" ");
      const affFromRest = rest ? parseAffiliationBlock(rest) : null;
      out.push({ name, affiliation: affFromRest });
    }
    return out;
  }

  if (Array.isArray(ann.bibauthor) && ann.bibauthor.length > 0) {
    const affArr = Array.isArray(ann.authoraffiliation) ? ann.authoraffiliation : [];
    for (let i = 0; i < ann.bibauthor.length; i++) {
      const raw = String(ann.bibauthor[i] || "");
      const name = norm(raw.split(/\n/)[0]) || "Unknown";
      const aff = affArr[i] ? parseAffiliationBlock(String(affArr[i])) : null;
      out.push({ name, affiliation: aff });
    }
    return out;
  }

  return out;
};

const isInformativeUniversity = (uni) => {
  if (!uni) return false;
  const s = String(uni).trim();
  if (s.length < 4) return false;
  if (/^\s*(department|dept|division|section)\b/i.test(s) && !/\b(university|univ|hospital|institute|college|faculty|centre|center)\b/i.test(s)) {
    return false;
  }
  if (/^\d+/.test(s)) return false;
  return true;
};

/* ---------------- App ---------------- */

export default function App() {
  const papers = useMemo(() => toPaperArray(rawData), []);

  const uniqueFields = useMemo(() => {
    const s = new Set();
    for (const p of papers) {
      const f = extractField(p);
      if (f) s.add(f);
    }
    return Array.from(s).filter(Boolean).sort();
  }, [papers]);

  const [selectedFields, setSelectedFields] = useState([]);
  useEffect(() => { setSelectedFields(uniqueFields.slice()); }, [uniqueFields]);

  const [ranking, setRanking] = useState([]);
  const [authorsByUniversity, setAuthorsByUniversity] = useState({});
  const [uniFieldContrib, setUniFieldContrib] = useState({});
  const [selectedUni, setSelectedUni] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const uniContrib = {};
    const uniPaperCount = {};
    const uniAuthorDetail = {};
    const uniFieldMap = {};

    for (const p of papers) {
      if (!p) continue;
      const field = extractField(p);
      if (selectedFields && selectedFields.length > 0) {
        if (!field || !selectedFields.includes(field)) continue;
      }
      const authors = buildAuthors(p);
      let authorList = authors;
      if (authorList.length === 0 && Array.isArray(p.api_authors)) {
        authorList = p.api_authors.map(a => ({ name: norm(a?.name || a) || "Unknown", affiliation: null }));
      }
      if (authorList.length === 0) continue;

      const perAuthor = 1 / Math.max(1, authorList.length);
      const seenUnis = new Set();
      for (const a of authorList) {
        const name = norm(a.name) || "Unknown";
        const affRaw = a.affiliation || null;
        const uniCandidate = affRaw ? normalizeUniversityName(affRaw) : null;
        const uni = isInformativeUniversity(uniCandidate) ? uniCandidate : null;
        if (!uni) continue; // skip if not informative

        if (!seenUnis.has(uni)) {
          seenUnis.add(uni);
          uniPaperCount[uni] = (uniPaperCount[uni] || 0) + 1;
        }
        uniContrib[uni] = (uniContrib[uni] || 0) + perAuthor;
        uniAuthorDetail[uni] = uniAuthorDetail[uni] || {};
        uniAuthorDetail[uni][name] = (uniAuthorDetail[uni][name] || 0) + perAuthor;

        if (field) {
          uniFieldMap[uni] = uniFieldMap[uni] || {};
          uniFieldMap[uni][field] = (uniFieldMap[uni][field] || 0) + perAuthor;
        }
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
      authorsByUniObj[u] = Object.entries(map).map(([author, contrib]) => ({ author, contribution: contrib, percent: total > 0 ? contrib / total : 0 })).sort((a, b) => b.contribution - a.contribution);
    });

    setRanking(sorted);
    setAuthorsByUniversity(authorsByUniObj);
    setUniFieldContrib(uniFieldMap);
  }, [papers, selectedFields]);

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
    return Object.keys(map).map(f => ({ field: f, contrib: map[f], pct: total > 0 ? (map[f] / total) * 100 : 0 })).sort((a,b)=>b.contrib - a.contrib).slice(0, n);
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
            <Grid item xs={12} md="auto" sx={{ width: { xs: "100%", md: 200 }, flexShrink: 0, position: { xs: "relative", md: "relative" }, top: { md: 0 }, alignSelf: "flex-start", zIndex: 30 }}>
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
