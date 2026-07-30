import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Printer, RefreshCw, Save, Barcode } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import AppModalOverlay from './AppModalOverlay';
import {
    sanitizeBarcodeValue,
    resolveBarcodeValue,
    generateProductBarcodeCode,
    getBarcodeLabelTitle,
    getBarcodeLabelPrice,
} from '../utils/barcode';

const BarcodePrintModal = ({
    isOpen,
    onClose,
    item,
    variant = null,
    darkMode,
    showToast,
    onSaveBarcode,
    saving = false,
}) => {
    const svgRef = useRef(null);
    const printAreaRef = useRef(null);
    const [code, setCode] = useState('');
    const [originalCode, setOriginalCode] = useState('');
    const [saveToProduct, setSaveToProduct] = useState(false);

    const title = item ? getBarcodeLabelTitle(item, variant) : '';
    const price = item ? getBarcodeLabelPrice(item, variant) : 0;
    const itemId = item?._id || item?.id || '';
    const variantId = variant?._id || variant?.id || '';
    const hadExistingCode = Boolean(
        variant
            ? sanitizeBarcodeValue(variant.hsn || variant.sku || '')
            : sanitizeBarcodeValue(item?.hsn || item?.barcode || item?.sku || '')
    );
    const codeChanged = sanitizeBarcodeValue(code) !== sanitizeBarcodeValue(originalCode);

    useEffect(() => {
        if (!isOpen || !item) return;
        const initial = resolveBarcodeValue(item, variant);
        setOriginalCode(initial);
        setCode(initial);
        setSaveToProduct(!hadExistingCode);
    // Only re-init when opening modal or switching product/variant — not on parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, itemId, variantId]);

    const fitSvgToLabel = useCallback((svg) => {
        if (!svg) return;
        const w = parseFloat(svg.getAttribute('width') || '0');
        const h = parseFloat(svg.getAttribute('height') || '0');
        if (!w || !h) return;
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
        svg.style.display = 'block';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }, []);

    const renderBarcode = useCallback(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const value = sanitizeBarcodeValue(code);
        if (!value) {
            svg.innerHTML = '';
            return;
        }
        const len = value.length;
        const barWidth = len > 14 ? 1 : len > 10 ? 1.25 : 1.75;
        const barHeight = len > 14 ? 52 : 64;
        try {
            JsBarcode(svg, value, {
                format: 'CODE128',
                width: barWidth,
                height: barHeight,
                displayValue: false,
                margin: 6,
                background: '#ffffff',
                lineColor: '#000000',
            });
            fitSvgToLabel(svg);
        } catch {
            svg.innerHTML = '';
        }
    }, [code, fitSvgToLabel]);

    useEffect(() => {
        renderBarcode();
    }, [renderBarcode]);

    const handleGenerate = () => {
        if (!item) return;
        setCode(generateProductBarcodeCode(item, variant, { fresh: true }));
        setSaveToProduct(true);
    };

    const handlePrint = () => {
        const value = sanitizeBarcodeValue(code);
        if (!value) {
            showToast?.('Enter or generate a barcode first.', 'warning');
            return;
        }
        const root = printAreaRef.current;
        if (!root) return;

        const labels = root.outerHTML;

        const printWindow = window.open('', '_blank', 'width=480,height=640');
        if (!printWindow) {
            showToast?.('Allow pop-ups to print labels.', 'error');
            return;
        }

        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode — ${title.replace(/</g, '')}</title>
  <style>
    @page { size: 58mm 40mm; margin: 2mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    .sheet { display: flex; flex-wrap: wrap; gap: 0; }
    .barcode-print-label {
      width: 54mm;
      min-height: 36mm;
      padding: 2mm 3mm;
      page-break-inside: avoid;
      break-inside: avoid;
      text-align: center;
      border: 0.2mm dashed #ccc;
      margin-bottom: 2mm;
    }
    .barcode-print-label h1 {
      font-size: 9pt;
      font-weight: 800;
      margin: 0 0 1mm;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .barcode-print-label .price {
      font-size: 11pt;
      font-weight: 900;
      margin: 0 0 2mm;
    }
    .barcode-print-label .code-text {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-top: 1mm;
      font-family: monospace;
    }
    .barcode-print-label .barcode-svg-wrap { width: 100%; overflow: hidden; }
    .barcode-print-label svg { display: block; width: 100%; max-width: 100%; height: auto; }
    @media print {
      .barcode-print-label { border: none; margin: 0; }
    }
  </style>
</head>
<body onload="window.print(); window.onafterprint = function(){ window.close(); };">
  <div class="sheet">${labels}</div>
</body>
</html>`);
        printWindow.document.close();
    };

    const handleSaveAndClose = async () => {
        const value = sanitizeBarcodeValue(code);
        if (!value) {
            showToast?.('Enter or generate a barcode first.', 'warning');
            return;
        }
        if (saveToProduct && onSaveBarcode) {
            try {
                await onSaveBarcode({ item, variant, barcode: value });
            } catch {
                return;
            }
        }
        onClose();
    };

    if (!isOpen || !item) return null;

    const theme = {
        bg: darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
        text: darkMode ? 'text-white' : 'text-slate-900',
        muted: darkMode ? 'text-slate-400' : 'text-slate-500',
        input: darkMode ? 'bg-gray-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900',
    };

    return (
        <AppModalOverlay onClose={onClose} busy={saving} ariaLabelledby="barcode-print-title" panelClassName="max-w-md">
            <section className={`${theme.bg} border rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[min(92vh,720px)]`}>
                <header className={`p-4 border-b flex justify-between items-start gap-3 shrink-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Barcode className="w-4 h-4 text-indigo-500 shrink-0" />
                            <h2 id="barcode-print-title" className={`text-sm font-black tracking-tight truncate ${theme.text}`}>
                                Generate Barcode
                            </h2>
                        </div>
                        <p className={`text-[10px] font-bold truncate ${theme.muted}`}>{title}</p>
                    </div>
                    <button type="button" onClick={onClose} className={`p-2 rounded-lg shrink-0 ${darkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                    <div
                        ref={printAreaRef}
                        className="barcode-print-label mx-auto w-full max-w-[280px] rounded-xl border border-slate-200 bg-white p-4 text-center text-black overflow-hidden"
                    >
                        <h1 className="text-xs font-black uppercase leading-tight mb-1 line-clamp-2 px-1">{title}</h1>
                        {price > 0 && <p className="price text-base font-black mb-2">₹{price.toLocaleString('en-IN')}</p>}
                        <div className="w-full min-w-0 overflow-hidden px-0.5">
                            <svg ref={svgRef} className="mx-auto w-full max-w-full" role="img" aria-label="Barcode" />
                        </div>
                        <p className="code-text text-[10px] font-mono font-bold mt-2 break-all px-1">{sanitizeBarcodeValue(code) || '—'}</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className={`text-[9px] font-black tracking-widest uppercase ${theme.muted}`}>
                            Barcode number
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                onBlur={() => setCode(sanitizeBarcodeValue(code))}
                                placeholder="Scan or generate"
                                className={`flex-1 font-mono text-sm font-bold px-3 py-2.5 rounded-xl border outline-none focus:border-indigo-500 ${theme.input}`}
                                style={{ fontSize: '16px' }}
                            />
                            <button
                                type="button"
                                onClick={handleGenerate}
                                title={hadExistingCode ? 'Regenerate barcode' : 'Generate new code'}
                                className={`shrink-0 px-3 py-2.5 rounded-xl border font-bold text-indigo-500 ${darkMode ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'}`}
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <p className={`text-[9px] ${theme.muted}`}>
                            Saved as HSN / barcode on the product. Use the same scanner as billing.
                        </p>
                    </div>

                    {onSaveBarcode && (!hadExistingCode || codeChanged) && (
                        <label className={`flex items-center gap-2 text-[10px] font-bold cursor-pointer ${theme.muted}`}>
                            <input
                                type="checkbox"
                                checked={saveToProduct}
                                onChange={(e) => setSaveToProduct(e.target.checked)}
                                className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
                            />
                            Save barcode to product
                        </label>
                    )}
                </div>

                <footer className={`p-4 border-t flex flex-col sm:flex-row gap-2 shrink-0 ${darkMode ? 'border-slate-800 bg-gray-950/50' : 'border-slate-100 bg-slate-50'}`}>
                    <button
                        type="button"
                        onClick={handlePrint}
                        disabled={!sanitizeBarcodeValue(code)}
                        className={`flex-1 py-3 rounded-xl border text-[10px] font-black tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 ${darkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-white bg-white'}`}
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                    {onSaveBarcode && (
                        <button
                            type="button"
                            onClick={handleSaveAndClose}
                            disabled={saving || !sanitizeBarcodeValue(code)}
                            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-black tracking-widest flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saveToProduct && (!hadExistingCode || codeChanged) ? 'Save & close' : 'Close'}
                        </button>
                    )}
                </footer>
            </section>
        </AppModalOverlay>
    );
};

export default BarcodePrintModal;
