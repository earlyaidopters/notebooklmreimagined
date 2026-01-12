/**
 * Export utilities for downloading study materials
 * Supports XLSX (Excel), PDF, PNG, PPTX, and DOCX exports
 */

// ============================================================================
// Types
// ============================================================================

export interface Flashcard {
  id?: string
  front: string
  back: string
  question?: string
  answer?: string
}

export interface QuizQuestion {
  id?: string
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

export interface FAQItem {
  question: string
  answer: string
}

export interface StudyGuideSection {
  heading: string
  content: string
}

export interface StudyGuide {
  title: string
  sections: StudyGuideSection[]
}

export interface MindMapNode {
  id: string
  label: string
  description?: string
  children?: MindMapNode[]
}

// Studio output types - matches the actual data from Gemini
export interface SlideDeckData {
  title: string
  subtitle?: string
  slides: Array<{
    slide_number?: number
    title: string
    content_type?: string
    main_content?: string
    bullet_points?: string[]
    speaker_notes?: string
  }>
  theme_suggestion?: string
}

export interface ReportData {
  title: string
  executive_summary?: string
  key_findings?: string[]
  key_takeaways?: string[]
  sections: Array<{
    heading: string
    content: string
  }>
  conclusion?: string
  recommendations?: string[]
}

// ============================================================================
// Markdown Parsing Helpers
// ============================================================================

interface TextRun {
  text: string
  bold?: boolean
}

/**
 * Parse markdown **bold** syntax into text runs for PPTX/DOCX
 * Converts "Hello **world** test" into [
 *   { text: "Hello ", bold: false },
 *   { text: "world", bold: true },
 *   { text: " test", bold: false }
 * ]
 */
function parseMarkdownBold(text: string): TextRun[] {
  const runs: TextRun[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match (non-bold)
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index), bold: false })
    }
    // Add the matched bold text
    runs.push({ text: match[1], bold: true })
    lastIndex = regex.lastIndex
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex), bold: false })
  }

  // If no matches, return original text
  if (runs.length === 0) {
    runs.push({ text, bold: false })
  }

  return runs
}

// ============================================================================
// Excel (XLSX) Export
// ============================================================================

/**
 * Download data as an Excel file
 */
export async function downloadAsExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  // Dynamically import xlsx to avoid SSR issues
  const XLSX = await import('xlsx')

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Auto-size columns
  const maxWidths: number[] = []
  data.forEach(row => {
    Object.values(row).forEach((val, idx) => {
      const len = String(val || '').length
      maxWidths[idx] = Math.max(maxWidths[idx] || 10, Math.min(len, 50))
    })
  })

  // Set column widths
  worksheet['!cols'] = maxWidths.map(w => ({ wch: w + 2 }))

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate and download
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Export flashcards to Excel
 */
export async function exportFlashcardsToExcel(
  flashcards: Flashcard[],
  filename = 'flashcards'
): Promise<void> {
  const data = flashcards.map((card, idx) => ({
    '#': idx + 1,
    'Question': card.front || card.question || '',
    'Answer': card.back || card.answer || ''
  }))

  await downloadAsExcel(data, filename, 'Flashcards')
}

/**
 * Export quiz to Excel
 */
export async function exportQuizToExcel(
  questions: QuizQuestion[],
  filename = 'quiz'
): Promise<void> {
  const data = questions.map((q, idx) => ({
    '#': idx + 1,
    'Question': q.question,
    'Option A': q.options[0] || '',
    'Option B': q.options[1] || '',
    'Option C': q.options[2] || '',
    'Option D': q.options[3] || '',
    'Correct Answer': String.fromCharCode(65 + q.correct_index), // A, B, C, D
    'Explanation': q.explanation
  }))

  await downloadAsExcel(data, filename, 'Quiz Questions')
}

/**
 * Export FAQ to Excel
 */
export async function exportFAQToExcel(
  items: FAQItem[],
  filename = 'faq'
): Promise<void> {
  const data = items.map((item, idx) => ({
    '#': idx + 1,
    'Question': item.question,
    'Answer': item.answer
  }))

  await downloadAsExcel(data, filename, 'FAQ')
}

// ============================================================================
// PDF Export
// ============================================================================

/**
 * Generate and download a PDF document
 */
export async function downloadAsPDF(
  content: PDFContent,
  filename: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  // Helper to check for page break
  const checkPageBreak = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  // Title
  if (content.title) {
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    const titleLines = doc.splitTextToSize(content.title, contentWidth)
    doc.text(titleLines, margin, y)
    y += titleLines.length * 10 + 10
  }

  // Subtitle
  if (content.subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(102, 102, 102)
    doc.text(content.subtitle, margin, y)
    y += 15
  }

  // Divider line
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  // Sections
  if (content.sections) {
    for (const section of content.sections) {
      checkPageBreak(30)

      // Section heading
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      const headingLines = doc.splitTextToSize(section.heading, contentWidth)
      doc.text(headingLines, margin, y)
      y += headingLines.length * 7 + 5

      // Section content
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(68, 68, 68)

      const contentLines = doc.splitTextToSize(section.content, contentWidth)
      for (const line of contentLines) {
        checkPageBreak(6)
        doc.text(line, margin, y)
        y += 6
      }

      y += 10 // Space after section
    }
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    doc.text(
      'Generated by NotebookLM Reimagined',
      margin,
      pageHeight - 10
    )
  }

  doc.save(`${filename}.pdf`)
}

interface PDFContent {
  title?: string
  subtitle?: string
  sections?: { heading: string; content: string }[]
}

/**
 * Export study guide to PDF
 */
export async function exportStudyGuideToPDF(
  guide: StudyGuide,
  filename = 'study-guide'
): Promise<void> {
  await downloadAsPDF(
    {
      title: guide.title,
      subtitle: `${guide.sections.length} sections • Generated study guide`,
      sections: guide.sections.map(section => ({
        heading: section.heading,
        content: section.content.replace(/\*\*/g, '').replace(/\*/g, '') // Strip markdown
      }))
    },
    filename
  )
}

/**
 * Export flashcards to PDF
 */
export async function exportFlashcardsToPDF(
  flashcards: Flashcard[],
  title = 'Flashcards',
  filename = 'flashcards'
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text(title, margin, y)
  y += 15

  // Subtitle
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.text(`${flashcards.length} cards`, margin, y)
  y += 15

  // Cards
  flashcards.forEach((card, idx) => {
    // Check if we need a new page
    if (y + 50 > pageHeight - margin) {
      doc.addPage()
      y = margin
    }

    // Card container
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'F')

    // Card number
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(102, 102, 102)
    doc.text(`Card ${idx + 1}`, margin + 5, y + 8)

    // Question
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    const question = card.front || card.question || ''
    const qLines = doc.splitTextToSize(`Q: ${question}`, contentWidth - 10)
    doc.text(qLines.slice(0, 2), margin + 5, y + 18)

    // Answer
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(68, 68, 68)
    const answer = card.back || card.answer || ''
    const aLines = doc.splitTextToSize(`A: ${answer}`, contentWidth - 10)
    doc.text(aLines.slice(0, 2), margin + 5, y + 32)

    y += 52
  })

  doc.save(`${filename}.pdf`)
}

/**
 * Export quiz to PDF
 */
export async function exportQuizToPDF(
  questions: QuizQuestion[],
  title = 'Quiz',
  filename = 'quiz'
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text(title, margin, y)
  y += 15

  // Subtitle
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.text(`${questions.length} questions`, margin, y)
  y += 15

  // Questions
  questions.forEach((q, idx) => {
    // Check if we need a new page
    if (y + 60 > pageHeight - margin) {
      doc.addPage()
      y = margin
    }

    // Question number and text
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    const qLines = doc.splitTextToSize(`${idx + 1}. ${q.question}`, contentWidth)
    doc.text(qLines, margin, y)
    y += qLines.length * 6 + 4

    // Options
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    q.options.forEach((opt, optIdx) => {
      const isCorrect = optIdx === q.correct_index
      doc.setTextColor(isCorrect ? 34 : 68, isCorrect ? 139 : 68, isCorrect ? 34 : 68)
      const optLine = `${String.fromCharCode(65 + optIdx)}) ${opt}${isCorrect ? ' ✓' : ''}`
      const optLines = doc.splitTextToSize(optLine, contentWidth - 10)
      doc.text(optLines, margin + 5, y)
      y += optLines.length * 5 + 2
    })

    // Explanation
    if (q.explanation) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(102, 102, 102)
      const expLines = doc.splitTextToSize(`💡 ${q.explanation}`, contentWidth - 10)
      doc.text(expLines.slice(0, 2), margin + 5, y + 2)
      y += Math.min(expLines.length, 2) * 4 + 4
    }

    y += 10
  })

  doc.save(`${filename}.pdf`)
}

/**
 * Export FAQ to PDF
 */
export async function exportFAQToPDF(
  items: FAQItem[],
  title = 'Frequently Asked Questions',
  filename = 'faq'
): Promise<void> {
  await downloadAsPDF(
    {
      title,
      subtitle: `${items.length} questions`,
      sections: items.map((item, idx) => ({
        heading: `Q${idx + 1}: ${item.question}`,
        content: item.answer
      }))
    },
    filename
  )
}

// ============================================================================
// Image (PNG) Export
// ============================================================================

/**
 * Export SVG element to PNG
 */
export async function exportSVGToPNG(
  svgElement: SVGSVGElement,
  filename: string,
  options: { scale?: number; backgroundColor?: string } = {}
): Promise<void> {
  const { scale = 2, backgroundColor = '#1a1a2e' } = options

  // Get SVG dimensions
  const bbox = svgElement.getBBox()
  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 800, 600]
  const width = viewBox[2] || bbox.width || 800
  const height = viewBox[3] || bbox.height || 600

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  // Fill background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.scale(scale, scale)

  // Clone SVG and inline styles to avoid cross-origin issues
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement

  // Ensure SVG has proper dimensions
  clonedSvg.setAttribute('width', String(width))
  clonedSvg.setAttribute('height', String(height))

  // Remove any external references that could cause CORS issues
  const images = clonedSvg.querySelectorAll('image')
  images.forEach(img => {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href')
    // Remove external image references that could taint canvas
    if (href && !href.startsWith('data:')) {
      img.remove()
    }
  })

  // Convert SVG to base64 data URL (avoids CORS tainting)
  const svgData = new XMLSerializer().serializeToString(clonedSvg)
  const svgBase64 = btoa(unescape(encodeURIComponent(svgData)))
  const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        ctx.drawImage(img, 0, 0)
        // Download
        const link = document.createElement('a')
        link.download = `${filename}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        resolve()
      } catch (error) {
        // Fallback: download as SVG if PNG export fails
        console.error('PNG export failed, falling back to SVG:', error)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const link = document.createElement('a')
        link.download = `${filename}.svg`
        link.href = URL.createObjectURL(svgBlob)
        link.click()
        URL.revokeObjectURL(link.href)
        resolve()
      }
    }
    img.onerror = () => {
      // Fallback: download as SVG if image load fails
      console.error('Image load failed, falling back to SVG')
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const link = document.createElement('a')
      link.download = `${filename}.svg`
      link.href = URL.createObjectURL(svgBlob)
      link.click()
      URL.revokeObjectURL(link.href)
      resolve()
    }
    img.src = svgDataUrl
  })
}

/**
 * Export Mind Map to PNG
 * Takes the SVG element from the mind map viewer and converts to PNG
 */
export async function exportMindMapToPNG(
  svgElement: SVGSVGElement,
  title: string,
  filename = 'mind-map'
): Promise<void> {
  await exportSVGToPNG(svgElement, filename, {
    scale: 2,
    backgroundColor: '#1e1e2e'
  })
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Data table structure for CSV export
 */
export interface DataTableExportData {
  title: string
  description?: string
  columns: Array<{ header: string; key: string; type?: string }>
  rows: Array<Record<string, string | number | boolean>>
}

/**
 * Export data table to CSV file
 */
export function exportDataTableToCSV(
  data: DataTableExportData,
  filename = 'data-table'
): void {
  // Build CSV content
  const headers = data.columns.map(col => `"${col.header.replace(/"/g, '""')}"`)
  const csvLines = [headers.join(',')]

  for (const row of data.rows) {
    const values = data.columns.map(col => {
      const value = row[col.key]
      if (value === null || value === undefined) return ''
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`
      }
      return String(value)
    })
    csvLines.push(values.join(','))
  }

  const csvContent = csvLines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

// ============================================================================
// Generic Utilities
// ============================================================================

/**
 * Generate a timestamped filename
 */
export function generateFilename(base: string): string {
  const date = new Date()
  const timestamp = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `${base}_${timestamp}`
}

/**
 * Trigger file download from blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================================
// PowerPoint (PPTX) Export
// ============================================================================

/**
 * Export slide deck to PowerPoint (PPTX) file
 */
export async function exportSlideDeckToPPTX(
  slideDeck: SlideDeckData,
  filename = 'presentation'
): Promise<void> {
  // Dynamically import pptxgenjs to avoid SSR issues
  const PptxGenJS = (await import('pptxgenjs')).default

  const pptx = new PptxGenJS()

  // Set presentation properties
  pptx.author = 'NotebookLM Reimagined'
  pptx.title = slideDeck.title
  pptx.subject = slideDeck.subtitle || 'Generated Presentation'
  pptx.company = 'NotebookLM Reimagined'

  // Define colors
  const primaryColor = '1a1a2e'
  const accentColor = '4f46e5'
  const textColor = '333333'
  const lightBg = 'f8f9fa'

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.addText(slideDeck.title, {
    x: 0.5,
    y: 2.0,
    w: '90%',
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: primaryColor,
    align: 'center',
    fontFace: 'Arial',
  })

  if (slideDeck.subtitle) {
    titleSlide.addText(slideDeck.subtitle, {
      x: 0.5,
      y: 3.7,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: '666666',
      align: 'center',
      fontFace: 'Arial',
    })
  }

  // Add footer to title slide
  titleSlide.addText('Generated by NotebookLM Reimagined', {
    x: 0.5,
    y: 5.2,
    w: '90%',
    fontSize: 12,
    color: '999999',
    align: 'center',
  })

  // Content slides
  slideDeck.slides.forEach((slide, index) => {
    const contentSlide = pptx.addSlide()

    // Slide title
    contentSlide.addText(slide.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: primaryColor,
      fontFace: 'Arial',
    })

    // Accent line under title
    contentSlide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.1,
      w: 1.5,
      h: 0.05,
      fill: { color: accentColor },
    })

    let contentY = 1.4

    // Main content (if present)
    if (slide.main_content) {
      contentSlide.addText(slide.main_content, {
        x: 0.5,
        y: contentY,
        w: '90%',
        h: 0.8,
        fontSize: 18,
        color: textColor,
        fontFace: 'Arial',
        valign: 'top',
      })
      contentY += 0.9
    }

    // Bullet points with markdown parsing (converts **bold** to actual bold)
    if (slide.bullet_points && slide.bullet_points.length > 0) {
      const formattedBullets: Array<{text: string, options: Record<string, unknown>}> = []

      slide.bullet_points.forEach((point) => {
        const runs = parseMarkdownBold(point)
        runs.forEach((run, runIdx) => {
          formattedBullets.push({
            text: run.text,
            options: {
              bold: run.bold,
              fontSize: 20,
              color: textColor,
              fontFace: 'Arial',
              // Add bullet only to first run of each point
              ...(runIdx === 0 ? { bullet: { type: 'bullet' as const, code: '2022' } } : {}),
              // Add paragraph break after last run of each bullet
              ...(runIdx === runs.length - 1 ? { breakLine: true, paraSpaceAfter: 12 } : {}),
            },
          })
        })
      })

      contentSlide.addText(formattedBullets, {
        x: 0.5,
        y: contentY,
        w: '90%',
        h: 3.5 - (contentY - 1.4),
        fontFace: 'Arial',
        valign: 'top',
      })
    }

    // Speaker notes
    if (slide.speaker_notes) {
      contentSlide.addNotes(slide.speaker_notes)
    }

    // Slide number
    contentSlide.addText(`${index + 1}`, {
      x: 9.0,
      y: 5.2,
      w: 0.5,
      fontSize: 12,
      color: '999999',
      align: 'right',
    })
  })

  // Save the presentation
  await pptx.writeFile({ fileName: `${filename}.pptx` })
}

// ============================================================================
// Word (DOCX) Export
// ============================================================================

/**
 * Export report to Word (DOCX) file
 */
export async function exportReportToDocx(
  report: ReportData,
  filename = 'report'
): Promise<void> {
  // Dynamically import docx to avoid SSR issues
  const {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    Packer,
    AlignmentType,
    BorderStyle,
    PageBreak,
  } = await import('docx')

  const children: (typeof Paragraph.prototype)[] = []

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: report.title,
          bold: true,
          size: 56, // 28pt
          color: '1a1a2e',
        }),
      ],
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
    })
  )

  // Generated by line
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated by NotebookLM Reimagined • ${new Date().toLocaleDateString()}`,
          size: 20, // 10pt
          color: '999999',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  )

  // Horizontal rule
  children.push(
    new Paragraph({
      border: {
        bottom: {
          color: 'cccccc',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { after: 400 },
    })
  )

  // Executive Summary
  if (report.executive_summary) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Executive Summary',
            bold: true,
            size: 32, // 16pt
            color: '1a1a2e',
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: report.executive_summary,
            size: 24, // 12pt
            color: '444444',
          }),
        ],
        spacing: { after: 300 },
      })
    )
  }

  // Key Findings
  if (report.key_findings && report.key_findings.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Key Findings',
            bold: true,
            size: 32, // 16pt
            color: '1a1a2e',
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    report.key_findings.forEach((finding) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: finding,
              size: 24, // 12pt
              color: '444444',
            }),
          ],
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      )
    })
  }

  // Main sections
  if (report.sections && report.sections.length > 0) {
    report.sections.forEach((section) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.heading,
              bold: true,
              size: 32, // 16pt
              color: '1a1a2e',
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )

      // Split content by paragraphs
      const paragraphs = section.content.split('\n\n')
      paragraphs.forEach((para) => {
        if (para.trim()) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: para.trim(),
                  size: 24, // 12pt
                  color: '444444',
                }),
              ],
              spacing: { after: 200 },
            })
          )
        }
      })
    })
  }

  // Conclusion
  if (report.conclusion) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Conclusion',
            bold: true,
            size: 32, // 16pt
            color: '1a1a2e',
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: report.conclusion,
            size: 24, // 12pt
            color: '444444',
          }),
        ],
        spacing: { after: 300 },
      })
    )
  }

  // Recommendations
  if (report.recommendations && report.recommendations.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Recommendations',
            bold: true,
            size: 32, // 16pt
            color: '1a1a2e',
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    report.recommendations.forEach((rec, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${rec}`,
              size: 24, // 12pt
              color: '444444',
            }),
          ],
          spacing: { after: 100 },
        })
      )
    })
  }

  // Key Takeaways (alternative to Key Findings used in some reports)
  if (report.key_takeaways && report.key_takeaways.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Key Takeaways',
            bold: true,
            size: 32, // 16pt
            color: '1a1a2e',
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    report.key_takeaways.forEach((takeaway) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: takeaway,
              size: 24, // 12pt
              color: '444444',
            }),
          ],
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      )
    })
  }

  // Create the document
  const doc = new Document({
    creator: 'NotebookLM Reimagined',
    title: report.title,
    description: 'Generated report',
    sections: [
      {
        children: children,
      },
    ],
  })

  // Generate and download
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${filename}.docx`)
}

// ============================================================================
// Notebook Export
// ============================================================================

/**
 * Options for notebook export
 */
export interface NotebookExportOptions {
  includeSources?: boolean
  includeChats?: boolean
  includeNotes?: boolean
  includeGenerated?: boolean
  format: 'zip' | 'pdf' | 'json'
}

/**
 * Notebook export data structure
 */
export interface NotebookExportData {
  notebook: {
    id: string
    name: string
    description?: string
    emoji?: string
    settings?: Record<string, unknown>
    created_at: string
  }
  exported_at: string
  export_version: string
  sources?: Array<{
    id: string
    name: string
    type: string
    status: string
    created_at: string
    metadata?: Record<string, unknown>
    source_guide?: Record<string, unknown>
  }>
  chat_sessions?: Array<{
    id: string
    title?: string
    created_at: string
    messages?: Array<{
      id: string
      role: string
      content: string
      citations?: unknown[]
      created_at: string
    }>
  }>
  notes?: Array<{
    id: string
    title?: string
    content: string
    tags?: string[]
    is_pinned?: boolean
    created_at: string
  }>
  audio_overviews?: Array<{
    id: string
    format?: string
    status: string
    script?: unknown
    created_at: string
  }>
  video_overviews?: Array<{
    id: string
    style?: string
    status: string
    script?: unknown
    created_at: string
  }>
  study_materials?: Array<{
    id: string
    type: string
    data: unknown
    created_at: string
  }>
  studio_outputs?: Array<{
    id: string
    type: string
    title?: string
    content: unknown
    created_at: string
  }>
  research_tasks?: Array<{
    id: string
    query: string
    status: string
    report_content?: string
    created_at: string
  }>
}

/**
 * Export a notebook as a ZIP file
 */
export async function exportNotebookAsZip(
  notebookId: string,
  options: Omit<NotebookExportOptions, 'format'>,
  authToken: string
): Promise<void> {
  const params = new URLSearchParams({
    format: 'zip',
    includeSources: String(options.includeSources ?? true),
    includeChats: String(options.includeChats ?? true),
    includeNotes: String(options.includeNotes ?? true),
    includeGenerated: String(options.includeGenerated ?? true),
  })

  const response = await fetch(`/api/notebooks/${notebookId}/export?${params}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to export notebook')
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('Content-Disposition')
  let filename = `notebook-export-${notebookId}.zip`

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match) {
      filename = match[1]
    }
  }

  downloadBlob(blob, filename)
}

/**
 * Export a notebook as JSON
 */
export async function exportNotebookAsJson(
  notebookId: string,
  options: Omit<NotebookExportOptions, 'format'>,
  authToken: string
): Promise<NotebookExportData> {
  const params = new URLSearchParams({
    format: 'json',
    includeSources: String(options.includeSources ?? true),
    includeChats: String(options.includeChats ?? true),
    includeNotes: String(options.includeNotes ?? true),
    includeGenerated: String(options.includeGenerated ?? true),
  })

  const response = await fetch(`/api/notebooks/${notebookId}/export?${params}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to export notebook')
  }

  const result = await response.json()
  return result.data
}

/**
 * Export a notebook as a comprehensive PDF document
 */
export async function exportNotebookAsPDF(
  notebookId: string,
  options: Omit<NotebookExportOptions, 'format'>,
  authToken: string
): Promise<void> {
  // First, fetch all data via JSON
  const exportData = await exportNotebookAsJson(notebookId, options, authToken)

  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Helper to check for page break
  const checkPageBreak = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  // Helper to add a section header
  const addSectionHeader = (title: string) => {
    checkPageBreak(20)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    doc.text(title, margin, y)
    y += 10
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8
  }

  // Title page
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  const title = exportData.notebook.name
  const titleLines = doc.splitTextToSize(title, contentWidth)
  doc.text(titleLines, margin, y + 30)
  y += 30 + titleLines.length * 12

  if (exportData.notebook.description) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(102, 102, 102)
    const descLines = doc.splitTextToSize(exportData.notebook.description, contentWidth)
    doc.text(descLines, margin, y)
    y += descLines.length * 6 + 10
  }

  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text(`Exported from NotebookLM Reimagined`, margin, y)
  y += 6
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y)

  // New page for content
  doc.addPage()
  y = margin

  // Table of Contents
  addSectionHeader('Table of Contents')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(68, 68, 68)

  let tocItems = []
  if (options.includeSources !== false && exportData.sources?.length) {
    tocItems.push(`Sources (${exportData.sources.length})`)
  }
  if (options.includeChats !== false && exportData.chat_sessions?.length) {
    tocItems.push(`Chat Sessions (${exportData.chat_sessions.length})`)
  }
  if (options.includeNotes !== false && exportData.notes?.length) {
    tocItems.push(`Notes (${exportData.notes.length})`)
  }
  if (options.includeGenerated !== false) {
    if (exportData.study_materials?.length) {
      tocItems.push(`Study Materials (${exportData.study_materials.length})`)
    }
    if (exportData.research_tasks?.length) {
      tocItems.push(`Research Reports (${exportData.research_tasks.length})`)
    }
  }

  tocItems.forEach((item, idx) => {
    doc.text(`${idx + 1}. ${item}`, margin + 5, y)
    y += 7
  })

  y += 10

  // Sources section
  if (options.includeSources !== false && exportData.sources?.length) {
    doc.addPage()
    y = margin
    addSectionHeader('Sources')

    for (const source of exportData.sources) {
      checkPageBreak(25)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      const sourceName = doc.splitTextToSize(source.name, contentWidth - 20)
      doc.text(sourceName, margin + 5, y)
      y += sourceName.length * 5 + 3

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(102, 102, 102)
      doc.text(`Type: ${source.type} | Status: ${source.status}`, margin + 5, y)
      y += 5

      // Add source guide summary if available
      if (source.source_guide) {
        const guide = source.source_guide as Record<string, unknown>
        if (guide.summary) {
          checkPageBreak(20)
          doc.setFontSize(10)
          doc.setTextColor(68, 68, 68)
          const summaryLines = doc.splitTextToSize(String(guide.summary), contentWidth - 10)
          doc.text(summaryLines.slice(0, 4), margin + 5, y)
          y += Math.min(summaryLines.length, 4) * 5
        }
      }

      y += 8
    }
  }

  // Chat sessions section
  if (options.includeChats !== false && exportData.chat_sessions?.length) {
    doc.addPage()
    y = margin
    addSectionHeader('Chat Sessions')

    for (const session of exportData.chat_sessions) {
      checkPageBreak(15)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      doc.text(session.title || 'Untitled Session', margin + 5, y)
      y += 7

      if (session.messages?.length) {
        doc.setFontSize(9)
        doc.setTextColor(102, 102, 102)
        doc.text(`${session.messages.length} messages`, margin + 5, y)
        y += 6

        // Show first few messages as preview
        const previewMessages = session.messages.slice(0, 4)
        for (const msg of previewMessages) {
          checkPageBreak(15)
          doc.setFontSize(10)
          doc.setFont('helvetica', msg.role === 'user' ? 'bold' : 'normal')
          doc.setTextColor(msg.role === 'user' ? 51 : 68, msg.role === 'user' ? 51 : 68, msg.role === 'user' ? 51 : 68)

          const prefix = msg.role === 'user' ? 'Q: ' : 'A: '
          const msgText = String(msg.content || '').slice(0, 200)
          const lines = doc.splitTextToSize(prefix + msgText + (msgText.length >= 200 ? '...' : ''), contentWidth - 15)
          doc.text(lines.slice(0, 3), margin + 10, y)
          y += Math.min(lines.length, 3) * 5 + 3
        }

        if (session.messages.length > 4) {
          doc.setFontSize(9)
          doc.setTextColor(150, 150, 150)
          doc.text(`... and ${session.messages.length - 4} more messages`, margin + 10, y)
          y += 5
        }
      }

      y += 8
    }
  }

  // Notes section
  if (options.includeNotes !== false && exportData.notes?.length) {
    doc.addPage()
    y = margin
    addSectionHeader('Notes')

    for (const note of exportData.notes) {
      checkPageBreak(30)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      doc.text(note.title || 'Untitled Note', margin + 5, y)
      y += 7

      if (note.tags?.length) {
        doc.setFontSize(9)
        doc.setTextColor(102, 102, 102)
        doc.text(`Tags: ${note.tags.join(', ')}`, margin + 5, y)
        y += 5
      }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(68, 68, 68)
      const noteContent = String(note.content || '').slice(0, 500)
      const lines = doc.splitTextToSize(noteContent + (noteContent.length >= 500 ? '...' : ''), contentWidth - 10)
      doc.text(lines.slice(0, 8), margin + 5, y)
      y += Math.min(lines.length, 8) * 5 + 10
    }
  }

  // Study materials section
  if (options.includeGenerated !== false && exportData.study_materials?.length) {
    doc.addPage()
    y = margin
    addSectionHeader('Study Materials')

    for (const material of exportData.study_materials) {
      checkPageBreak(15)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)

      const typeLabels: Record<string, string> = {
        flashcards: 'Flashcards',
        quiz: 'Quiz',
        study_guide: 'Study Guide',
        faq: 'FAQ',
        mind_map: 'Mind Map',
      }
      doc.text(typeLabels[material.type] || material.type, margin + 5, y)
      y += 6

      doc.setFontSize(9)
      doc.setTextColor(102, 102, 102)
      doc.text(`Created: ${new Date(material.created_at).toLocaleDateString()}`, margin + 5, y)
      y += 10
    }
  }

  // Research reports section
  if (options.includeGenerated !== false && exportData.research_tasks?.length) {
    doc.addPage()
    y = margin
    addSectionHeader('Research Reports')

    for (const research of exportData.research_tasks) {
      checkPageBreak(30)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      const queryLines = doc.splitTextToSize(research.query, contentWidth - 10)
      doc.text(queryLines, margin + 5, y)
      y += queryLines.length * 5 + 3

      doc.setFontSize(9)
      doc.setTextColor(102, 102, 102)
      doc.text(`Status: ${research.status}`, margin + 5, y)
      y += 6

      if (research.report_content) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(68, 68, 68)
        const reportPreview = String(research.report_content).slice(0, 400)
        const lines = doc.splitTextToSize(reportPreview + (reportPreview.length >= 400 ? '...' : ''), contentWidth - 10)
        doc.text(lines.slice(0, 6), margin + 5, y)
        y += Math.min(lines.length, 6) * 5
      }

      y += 10
    }
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text('Generated by NotebookLM Reimagined', margin, pageHeight - 10)
  }

  // Generate filename and save
  const safeName = exportData.notebook.name.replace(/[^a-zA-Z0-9 _-]/g, '_')
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  doc.save(`notebook-export-${safeName}-${dateStr}.pdf`)
}

/**
 * Export a notebook with the specified format
 */
export async function exportNotebook(
  notebookId: string,
  options: NotebookExportOptions,
  authToken: string
): Promise<void> {
  switch (options.format) {
    case 'zip':
      return exportNotebookAsZip(notebookId, options, authToken)
    case 'pdf':
      return exportNotebookAsPDF(notebookId, options, authToken)
    case 'json':
      const data = await exportNotebookAsJson(notebookId, options, authToken)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const safeName = data.notebook.name.replace(/[^a-zA-Z0-9 _-]/g, '_')
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      downloadBlob(blob, `notebook-export-${safeName}-${dateStr}.json`)
      return
    default:
      throw new Error(`Unsupported format: ${options.format}`)
  }
}
