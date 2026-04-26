const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Add states
const stateAddition = `  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const resetLightbox = () => { setZoomLevel(1); setPanPos({x: 0, y: 0}); };
  const closeLightbox = () => { setLightboxImage(null); resetLightbox(); };

  const handleLightboxWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.1;
    const delta = e.deltaY < 0 ? zoomSensitivity : -zoomSensitivity;
    setZoomLevel(prev => Math.min(Math.max(0.5, prev + delta), 5));
  };
  const handleLightboxMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); setIsDragging(true); setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
  };
  const handleLightboxMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleLightboxMouseUp = () => { setIsDragging(false); };
`;

content = content.replace('  const [isSubmitting, setIsSubmitting] = useState(false);', '  const [isSubmitting, setIsSubmitting] = useState(false);\n' + stateAddition);

// 2. Replace Links with Buttons
content = content.replace(/<a href=\{c\.link_nota_pembelian\} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-800">Lihat Nota<\/a>/g, 
  '<button type="button" onClick={() => { setLightboxImage(c.link_nota_pembelian!); resetLightbox(); }} className="hover:underline hover:text-blue-800 text-left">Lihat Nota</button>');

content = content.replace(/<a href=\{c\.link_kartu_garansi\} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-800">Lihat Garansi<\/a>/g, 
  '<button type="button" onClick={() => { setLightboxImage(c.link_kartu_garansi!); resetLightbox(); }} className="hover:underline hover:text-blue-800 text-left">Lihat Garansi</button>');

content = content.replace(/<a href=\{linkNota\} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-800">Lihat Nota<\/a>/g, 
  '<button type="button" onClick={() => { setLightboxImage(linkNota!); resetLightbox(); }} className="hover:underline hover:text-blue-800 text-left">Lihat Nota</button>');

content = content.replace(/<a href=\{linkGaransi\} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-800">Lihat Garansi<\/a>/g, 
  '<button type="button" onClick={() => { setLightboxImage(linkGaransi!); resetLightbox(); }} className="hover:underline hover:text-blue-800 text-left">Lihat Garansi</button>');

content = content.replace(/<a href=\{claimForm\.link_nota_pembelian\} target="_blank" rel="noreferrer" className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all">🔗 Link Nota Pembelian<\/a>/g, 
  '<button type="button" onClick={(e) => { e.preventDefault(); setLightboxImage(claimForm.link_nota_pembelian!); resetLightbox(); }} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Link Nota Pembelian</button>');

content = content.replace(/<a href=\{claimForm\.link_kartu_garansi\} target="_blank" rel="noreferrer" className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all">🔗 Link Kartu Garansi<\/a>/g, 
  '<button type="button" onClick={(e) => { e.preventDefault(); setLightboxImage(claimForm.link_kartu_garansi!); resetLightbox(); }} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Link Kartu Garansi</button>');

content = content.replace(/<a href=\{n\} target="_blank" rel="noreferrer" className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all">🔗 Lihat Bukti Nota<\/a>/g, 
  '<button type="button" onClick={(e) => { e.preventDefault(); setLightboxImage(n!); resetLightbox(); }} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Lihat Bukti Nota</button>');

content = content.replace(/<a href=\{g\} target="_blank" rel="noreferrer" className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all">🔗 Lihat Bukti Kartu Garansi<\/a>/g, 
  '<button type="button" onClick={(e) => { e.preventDefault(); setLightboxImage(g!); resetLightbox(); }} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Lihat Bukti Kartu Garansi</button>');

// 3. Add Lightbox Modal at the end, right before `{printData && (`
const lightboxModal = `
      {/* --- LIGHTBOX MODAL --- */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[150] overflow-hidden" 
             onWheel={handleLightboxWheel} 
             onMouseUp={handleLightboxMouseUp} 
             onMouseLeave={handleLightboxMouseUp} 
             onMouseMove={handleLightboxMouseMove}>
             
          <div className="absolute top-4 right-4 z-50 flex gap-3 bg-black/50 p-2 rounded-lg border border-white/10 backdrop-blur-sm shadow-xl">
             <div className="text-white flex items-center gap-3 px-3 text-sm font-bold">
                <button onClick={() => setZoomLevel(p => Math.max(0.5, p - 0.2))} className="hover:text-[#FFE500] text-xl leading-none w-6 h-6 flex items-center justify-center">-</button>
                <span className="w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(p => Math.min(5, p + 0.2))} className="hover:text-[#FFE500] text-xl leading-none w-6 h-6 flex items-center justify-center">+</button>
                <button onClick={resetLightbox} className="ml-2 hover:text-[#FFE500] text-xs underline text-slate-300">Reset</button>
             </div>
             <div className="w-px h-6 bg-white/20"></div>
             <button onClick={closeLightbox} className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full font-bold flex items-center justify-center shadow-lg transition leading-none text-lg">×</button>
          </div>
          
          <div className="text-white/50 text-xs absolute bottom-8 select-none font-medium text-center z-50 pointer-events-none drop-shadow-md">
             Scroll (Mouse Wheel) untuk Zoom In/Out <br/> Klik dan Tahan (Drag) untuk Menggeser
          </div>

          <div className="flex-1 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing relative overflow-hidden"
               onMouseDown={handleLightboxMouseDown}>
             <img src={lightboxImage} alt="Preview Dokumen" 
                  draggable={false}
                  className="max-w-none max-h-[90vh] transition-transform duration-75 ease-out select-none pointer-events-none"
                  style={{ transform: \`translate(\${panPos.x}px, \${panPos.y}px) scale(\${zoomLevel})\` }} />
          </div>
        </div>
      )}

`;

content = content.replace('      {printData && (', lightboxModal + '      {printData && (');

fs.writeFileSync('app/page.tsx', content);
