export const THEME_INIT_SCRIPT = `(function(){try{
var raw=localStorage.getItem("kardiary:appearance");
if(!raw)return;
var s=JSON.parse(raw);
if(!s||!s.palettes)return;
var dark=s.mode==="dark"||(s.mode==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var c=dark?s.palettes.dark:s.palettes.light;
var fonts={
editorial:['"Avenir Next", "Segoe UI", system-ui, sans-serif','"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif'],
modern:['"Segoe UI", system-ui, -apple-system, sans-serif','"Segoe UI", system-ui, -apple-system, sans-serif'],
"classic-serif":['Georgia, "Times New Roman", serif','"Palatino Linotype", "Book Antiqua", Georgia, serif'],
"soft-rounded":['"Trebuchet MS", "Segoe UI", system-ui, sans-serif','"Trebuchet MS", "Segoe UI", system-ui, sans-serif'],
humanist:['Candara, Optima, "Segoe UI", system-ui, sans-serif','Candara, Optima, "Segoe UI", system-ui, sans-serif'],
mono:['"Cascadia Code", "SFMono-Regular", Consolas, monospace','"Cascadia Code", "SFMono-Regular", Consolas, monospace']
};
var f=fonts[s.typography&&s.typography.fontFamily]||fonts.editorial;
var shadows={
none:"none",
soft:"0 1px 2px rgba(30,25,18,0.04), 0 10px 28px -20px rgba(30,25,18,0.28)",
medium:"0 2px 4px rgba(30,25,18,0.05), 0 18px 40px -24px rgba(30,25,18,0.38)",
strong:"0 6px 16px rgba(15,12,8,0.12), 0 30px 60px -30px rgba(15,12,8,0.55)"
};
var l=s.layout||{}; var t=s.typography||{}; var cal=s.calendar||{}; var bg=s.background||{};
var r=document.documentElement; var st=r.style;
var map={
"--bg":c.background,"--surface":c.surface,"--card":c.card,"--text":c.text,"--muted":c.muted,
"--primary":c.primary,"--primary-contrast":c.primaryText,"--accent":c.accent,"--border":c.border,
"--selected":c.selected,"--selected-contrast":c.selectedText,"--today":c.today,"--danger":c.danger
};
for(var k in map)st.setProperty(k,map[k]);
var meta=document.querySelector('meta[name="theme-color"]'); if(meta)meta.setAttribute("content",c.surface);
st.setProperty("--font-body",f[0]); st.setProperty("--font-heading",f[1]);
st.setProperty("--font-size-base",(t.baseSize||16)+"px");
st.setProperty("--heading-scale",String(t.headingScale||1));
st.setProperty("--line-height",String(t.lineHeight||1.7));
st.setProperty("--letter-spacing",(t.letterSpacing||0)+"px");
st.setProperty("--radius",(l.radius==null?18:l.radius)+"px");
st.setProperty("--radius-sm",Math.max(4,(l.radius==null?18:l.radius)*0.55)+"px");
st.setProperty("--radius-lg",(l.radius==null?18:l.radius)*1.5+"px");
st.setProperty("--shadow",shadows[l.shadow]||shadows.soft);
st.setProperty("--page-width",(l.pageWidth||1240)+"px");
st.setProperty("--cell-size",(l.cellSize||92)+"px");
st.setProperty("--cell-gap",(l.cellGap==null?8:l.cellGap)+"px");
if(bg.type==="gradient"){st.setProperty("--bg-image","linear-gradient(160deg, "+(bg.gradientFrom||c.background)+", "+(bg.gradientTo||c.surface)+")");st.setProperty("--bg-overlay-opacity","0");}
r.dataset.theme=dark?"dark":"light";
r.dataset.grid=cal.gridStyle||"cards";
r.dataset.nav=l.nav||"sidebar";
r.dataset.density=l.density||"spacious";
r.dataset.imageStyle=s.imageStyle||"rounded";
r.dataset.indicator=cal.entryIndicator||"dot";
r.style.colorScheme=dark?"dark":"light";
}catch(e){}})()`;
