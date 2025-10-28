'use client'

import Image from "next/image"
import { ChangeEvent, useCallback, useMemo, useRef, useState } from "react"

const PDF_WORKER_SRC = "/pdf.worker.min.mjs"

let cachedPdfjs: Promise<typeof import("pdfjs-dist/legacy/build/pdf")> | null = null

function loadPdfjs() {
  if (!cachedPdfjs) {
    cachedPdfjs = import("pdfjs-dist/legacy/build/pdf").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC
      pdfjsLib.GlobalWorkerOptions.workerType = "module"
      return pdfjsLib
    })
  }
  return cachedPdfjs
}

export default function Letterhead() {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [renderedImage, setRenderedImage] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1.0)

  const hasPreview = !!renderedImage

  const instructions = useMemo(() => {
    if (!pdfName) {
      return "Upload a single-page PDF to place it on the letterhead."
    }
    if (!pageCount || pageCount <= 1) {
      return `Ready to print ${pdfName}. Adjust the zoom if needed before printing.`
    }
    return `Showing the first page of ${pdfName}. Please upload a single-page PDF for best results. Adjust the zoom if needed before printing.`
  }, [pageCount, pdfName])

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      setRenderError("Please select a PDF file.")
      setRenderedImage(null)
      setPdfName(null)
      setPageCount(null)
      return
    }

    setPdfName(file.name)
    setZoomLevel(1.0)
    setRenderError(null)
    setIsRendering(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfjsLib = await loadPdfjs()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      setPageCount(pdf.numPages)

      const page = await pdf.getPage(1)
      const unscaledViewport = page.getViewport({ scale: 1 })
      const container = previewContainerRef.current
      const containerWidth = container?.clientWidth ?? unscaledViewport.width
      
      // Use very high scale for ultra-crisp rendering
      const targetScale = containerWidth / unscaledViewport.width
      const renderScale = targetScale * 4 // 4x for super high quality
      const scaledViewport = page.getViewport({ scale: renderScale })

      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d", { 
        alpha: false,
        desynchronized: false,
        willReadFrequently: false
      })
      if (!context) {
        throw new Error("Unable to create canvas context for preview.")
      }

      // Set canvas to exact high quality dimensions
      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height

      // Disable smoothing for crisp text
      context.imageSmoothingEnabled = false

      const renderContext: any = {
        canvasContext: context,
        viewport: scaledViewport,
      }

      // Clear and render
      context.clearRect(0, 0, canvas.width, canvas.height)
      await page.render(renderContext).promise

      // Use high quality JPEG to reduce blur
      const dataUrl = canvas.toDataURL("image/jpeg", 1.0)
      setRenderedImage(dataUrl)
    } catch (error) {
      console.error(error)
      setRenderedImage(null)
      setPageCount(null)
      const message =
        error instanceof Error ? error.message : "Something went wrong while rendering the PDF."
      setRenderError(message)
    } finally {
      setIsRendering(false)
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel((value) => {
      const next = Math.max(0.8, value - 0.1)
      return Number(next.toFixed(2))
    })
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoomLevel((value) => {
      const next = Math.min(1.8, value + 0.1)
      return Number(next.toFixed(2))
    })
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1.0)
  }, [])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const zoomLabel = useMemo(() => `${Math.round(zoomLevel * 100)}%`, [zoomLevel])

  return (
    <div className="letterhead-container relative max-w-[210mm] mx-auto bg-white shadow-lg min-h-[297mm] flex flex-col">
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo01-lsrsJ1oTJdbvbbiDAjnzGyevs68W1B.png"
          alt="Watermark"
          width={400}
          height={400}
          className="object-contain"
        />
      </div>

      <div className="relative z-10 px-8 pt-6 pb-2 print:pt-4 print:pb-1">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-start mb-2 print:mb-1 print:gap-4">
          {/* English Column - Left */}
          <div className="text-left">
            <h1 className="text-sm font-bold text-[#003d5c] mb-1">TABIB AL ARABIA TRADING CO.</h1>
            <p className="text-xs text-gray-700 mb-2">For Sale, Purchase and Galvanizing Metal</p>
            <p className="text-[10px] text-gray-600">C.R 2062028336 - C.C No.: 108088</p>
            <p className="text-[10px] text-gray-600">VAT No.: 311333361900003</p>
          </div>

          {/* Logo - Center */}
          <div className="flex-shrink-0">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo01-lsrsJ1oTJdbvbbiDAjnzGyevs68W1B.png"
              alt="Company Logo"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>

          {/* Arabic Column - Right */}
          <div dir="rtl" className="text-right">
            <h2 className="text-sm font-bold text-[#003d5c] mb-1">شركة طبيب العربية التجارية</h2>
            <p className="text-xs text-gray-700 mb-2">لبيع وشراء وجلفنة المعادن</p>
            <p className="text-[10px] text-gray-600">س.ت ٢٠٦٢٠٢٨٣٣٦ - س.س رقم: ١٠٨٠٨٨</p>
            <p className="text-[10px] text-gray-600">الرقم الضريبي: ٣١١٣٣٣٣٦١٩٠٠٠٠٣</p>
          </div>
        </div>

        <div className="border-t-2 border-[#003d5c]"></div>
      </div>

      {/* Content Area */}
      <div className="letterhead-content relative z-10 flex-1 px-8 pt-0 pb-6 flex flex-col gap-4 print:gap-0 print:pt-0 print:pb-0">
        <div className="print:hidden flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex-1 text-sm font-medium text-gray-700">
            Upload PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="mt-2 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal text-gray-600 shadow-sm focus:border-[#003d5c] focus:outline-none focus:ring-1 focus:ring-[#003d5c]"
            />
          </label>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center justify-between gap-2 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700">
              <span className="font-medium">Zoom</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={!hasPreview || zoomLevel <= 0.8}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                >
                  &minus;
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  disabled={!hasPreview}
                  className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100"
                >
                  {zoomLabel}
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={!hasPreview || zoomLevel >= 1.8}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                >
                  +
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!hasPreview}
              className="inline-flex h-10 items-center justify-center rounded bg-[#003d5c] px-5 text-sm font-semibold text-white transition hover:bg-[#0a5275] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              Print
            </button>
          </div>
        </div>

        <div className="letterhead-preview relative flex-1 min-h-[500px] overflow-hidden rounded border border-dashed border-gray-300 bg-white print:min-h-0 print:h-full print:rounded-none print:border-none">
          <div
            ref={previewContainerRef}
            className="preview-inner absolute inset-0 flex items-start justify-center overflow-auto bg-transparent print:overflow-hidden print:items-center"
          >
            {renderedImage ? (
              <div
                style={{
                  width: `${zoomLevel * 100}%`,
                  display: 'flex',
                  justifyContent: 'center',
                  minWidth: '100%',
                }}
              >
                <img
                  src={renderedImage}
                  alt={pdfName ?? "Uploaded PDF preview"}
                  className="preview-image h-auto w-full"
                  style={{
                    imageRendering: 'crisp-edges',
                  }}
                />
              </div>
            ) : (
              <p className="self-center px-4 text-center text-sm text-gray-400 print:hidden">
                Upload a single-page PDF to preview it here.
              </p>
            )}
          </div>
        </div>

        <div className="print:hidden space-y-1 text-sm text-gray-600">
          <p>{instructions}</p>
          {isRendering && <p className="text-[#003d5c]">Rendering PDF…</p>}
          {renderError && <p className="text-red-600">{renderError}</p>}
        </div>
      </div>

      <div className="letterhead-footer relative z-10 mt-auto bg-[#FF8C00] text-white font-bold text-sm px-8 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>P.O. Box 67568 · Dammam 31517 · Kingdom of Saudi Arabia · www.tabibalarabia.com · sales@tabibalarabia.com</div>
        <div dir="rtl">ص.ب ٦٧٥٦٨ · الدمام ٣١٥١٧ · المملكة العربية السعودية · www.tabibalarabia.com · sales@tabibalarabia.com</div>
      </div>
    </div>
  )
}
