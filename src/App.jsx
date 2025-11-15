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
  // new beta format: { results: [...] }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  // old format: object map of papers
  return Object.values(data);
};

const norm = (s) => {
  if (!s && s !== 0) return null;
  return String(s).replace(/\s+/g, " ").trim();
};

const normalizeOrg = (s) => {
  if (!s) return null;
  let t = String(s).trim();
  t = t.replace(/\s+/g, " ").replace(/^[,.\-:\s]+|[,.\-:\s]+$/g, "");
  if (t.length === 0) return null;
  // strip common trailing/noisy tokens
  t = t.replace(/\s+Vietnam$/i, ""); // optional, keep shorter
  if (t.length < 3) return null;
  return t;
};

const looksLikeDept = (s) => {
  if (!s) return false;
  return /^\s*(department|dept|division|section|faculty of)\b/i.test(s);
};

/* Build lightweight list of affiliations (prefer api_authors + authoraffiliation, fallback to matched_strings) */
const extractAffiliationsForPaper = (paper) => {
  // returns array of affiliation strings (normalized)
  if (!paper) return [];

  // 1) try content.annotations + api_authors pairing
  const ann = paper.content?.annotations ?? {};
  if (Array.isArray(paper.api_authors) && paper.api_authors.length > 0) {
    // if authoraffiliation aligned and present, use them
    if (Array.isArray(ann.authoraffiliation) && ann.authoraffiliation.length >= paper.api_authors.length) {
      const affs = ann.authoraffiliation.map(a => normalizeOrg(a)).filter(Boolean).filter(x => !looksLikeDept(x));
      if (affs.length) return affs;
    }
    // else maybe authors have inline affiliations in ann.author
  }

  // 2) try ann.authorarray with ann.authoraffiliation
  if (Array.isArray(ann.author) && ann.author.length > 0) {
    if (Array.isArray(ann.authoraffiliation) && ann.authoraffiliation.length >= ann.author.length) {
      const affs = ann.authoraffiliation.map(a => normalizeOrg(a)).filter(Boolean).filter(x => !looksLikeDept(x));
      if (affs.length) return affs;
    }
    // try parse each ann.author: after first line maybe affiliation
    const parsed = [];
    for (const raw of ann.author) {
      const s = String(raw || "");
      const lines = s.split(/\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const possible = normalizeOrg(lines.slice(1).join(" "));
        if (possible && !looksLikeDept(possible)) parsed.push(possible);
      }
    }
    if (parsed.length) return parsed;
  }

  // 3) fallback: matched_strings (beta)
  if (Array.isArray(paper.matched_strings) && paper.matched_strings.length > 0) {
    const arr = paper.matched_strings.map(m => normalizeOrg(m)).filter(Boolean).filter(x => !looksLikeDept(x));
    if (arr.length) return arr;
  }

  // 4) fallback: api_journal or api_venue as a last resort (not as uni)
  if (paper.api_journal?.name) {
    const n = normalizeOrg(paper.api_journal.name);
    if (n && !looksLikeDept(n)) return [n];
  }

  return [];
};

/* Extract field (ONLY api_fieldsOfStudy) */
const extractField = (paper) => {
  if (!paper) return null;
  if (Array.isArray(paper.api_fieldsOfStudy) && paper.api_fieldsOfStudy.length) {
    const f = paper.api_fieldsOfStudy[0];
    return norm(f);
  }
  // keep null if not present
  return null;
};

/* ---------------- App ---------------- */

export default function App() {
  const papers = useMemo(() => toPaperArray(rawData), [rawData]);

  // precompute lightweight meta: id, field, affiliations (array), title
  const paperMeta = useMemo(() => {
    return papers.map(p => {
      const id = p.corpusid ?? p.corpusId ?? p.id ?? null;
      const field = extractField(p); // may be null for beta
      const affiliations = extractAffiliationsForPaper(p); // [] if none
      const title = norm(p.title || p.api_title || "");
      return { id, field, affiliations, title, raw: p };
    });
  }, [papers]);

  // unique fields from api_fieldsOfStudy only
  const uniqueFields = useMemo(() => {
    const s = new Set();
    for (const pm of paperMeta) {
      if (pm.field) s.add(pm.field);
    }
    return Array.from(s).sort();
  }, [paperMeta]);

  const [selectedFields, setSelectedFields] = useState([]);
  useEffect(() => { setSelectedFields(uniqueFields.slice()); }, [uniqueFields]);

  const [ranking, setRanking] = useState([]);
  const [authorsByUniversity, setAuthorsByUniversity] = useState({});
  const [uniFieldContrib, setUniFieldContrib] = useState({});
  const [selectedUni, setSelectedUni] = useState(null);
  const [open, setOpen] = useState(false);

  // compute ranking: for each paper, split 1.0 equally across detected affiliations
  useEffect(() => {
    const uniContrib = Object.create(null);
    const uniPaperCount = Object.create(null);
    const uniAuthorDetail = Object.create(null);
    const uniFieldMap = Object.create(null);

    for (const pm of paperMeta) {
      // field filter
      if (selectedFields && selectedFields.length > 0 && pm.field && !selectedFields.includes(pm.field)) continue;
      if (selectedFields && selectedFields.length > 0 && !pm.field) {
        // if user filtered to some fields but this paper has no field, skip (conservative)
        continue;
      }

      // affiliations array; if empty -> skip (we don't want "Unknown")
      const affs = pm.affiliations || [];
      if (!affs || affs.length === 0) continue;

      // per-paper: distribute 1.0 equally among affiliations
      const perUni = 1 / affs.length;
      const seen = new Set();

      for (const aff of affs) {
        const uni = norm(aff);
        if (!uni) continue;
        if (seen.has(uni)) continue;
        seen.add(uni);

        uniContrib[uni] = (uniContrib[uni] || 0) + perUni;
        uniPaperCount[uni] = (uniPaperCount[uni] || 0) + 1;

        // author detail: since we don't have author names in beta, we store a pseudo-author "N/A" per paper
        if (!uniAuthorDetail[uni]) uniAuthorDetail[uni] = Object.create(null);
        const pseudo = pm.raw.api_authors ? pm.raw.api_authors.map(a => norm(a?.name || a)).filter(Boolean) : ["(không rõ tác giả)"];
        for (const pa of pseudo) {
          const name = norm(pa) || "(không rõ tác giả)";
          uniAuthorDetail[uni][name] = (uniAuthorDetail[uni][name] || 0) + perUni / pseudo.length;
        }

        if (pm.field) {
          if (!uniFieldMap[uni]) uniFieldMap[uni] = Object.create(null);
          uniFieldMap[uni][pm.field] = (uniFieldMap[uni][pm.field] || 0) + perUni;
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
