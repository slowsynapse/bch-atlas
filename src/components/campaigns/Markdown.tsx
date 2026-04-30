/**
 * Tiny markdown renderer — campaigns descriptions only.
 *
 * Handles the subset of markdown we actually see in Flipstarter / FundMe
 * campaign descriptions: headings (#, ##, ###), bullet/numbered lists,
 * paragraphs, hr, blockquotes, inline links/bold/italic/code. No tables,
 * no images, no nested lists. No library dependency — this is server-side
 * rendered HTML so we control every character.
 *
 * Inputs are user-submitted descriptions; we escape every text segment
 * before allowing markdown syntax through, so authored markdown like
 * `[link](url)` works but a stray `<script>` is rendered literally.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(text: string): string {
  // Order matters: code first (so we don't process * or _ inside backticks),
  // then images→stripped (we don't render them), then links, then emphasis.
  let out = escapeHtml(text)

  // `code spans`
  out = out.replace(/`([^`]+)`/g, (_, code) =>
    `<code class="px-1 py-0.5 rounded font-mono text-[12px]" style="background:rgba(0,224,160,0.08);color:#9ED9C0">${code}</code>`,
  )

  // ![alt](url) → drop (we don't render arbitrary images)
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')

  // [text](url) → safe links: only http(s) URLs allowed, target=_blank
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, raw: string) => {
    const url = raw.trim()
    if (!/^https?:\/\//i.test(url)) return label
    const safeUrl = url.replace(/"/g, '%22')
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="underline transition-colors" style="color:#00E0A0">${label}</a>`
  })

  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-[#E0E4E8]">$1</strong>')
  // *italic*  (avoid bolds we just consumed)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')

  return out
}

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'hr' | 'quote'
  lines: string[]
}

function blocksFrom(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip blank lines between blocks
    if (!trimmed) { i++; continue }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr', lines: [] })
      i++
      continue
    }

    // Headings
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3
      const tag = (`h${level}`) as 'h1' | 'h2' | 'h3'
      blocks.push({ type: tag, lines: [heading[2]] })
      i++
      continue
    }

    // Bullet list (consume contiguous - / * lines)
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', lines: items })
      continue
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', lines: items })
      continue
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      const quoted: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', lines: [quoted.join(' ')] })
      continue
    }

    // Paragraph (consume until blank line or block start)
    const paraLines: string[] = []
    while (i < lines.length) {
      const cur = lines[i]
      const curTrim = cur.trim()
      if (!curTrim) break
      if (/^(#{1,3})\s+/.test(curTrim)) break
      if (/^[-*]\s+/.test(curTrim)) break
      if (/^\d+\.\s+/.test(curTrim)) break
      if (/^>\s?/.test(curTrim)) break
      if (/^(-{3,}|_{3,}|\*{3,})$/.test(curTrim)) break
      paraLines.push(cur)
      i++
    }
    blocks.push({ type: 'p', lines: [paraLines.join(' ')] })
  }

  return blocks
}

function renderBlock(block: Block): string {
  switch (block.type) {
    case 'h1':
      return `<h3 class="text-base text-[#E0E4E8] font-medium mt-5 mb-2">${renderInline(block.lines[0])}</h3>`
    case 'h2':
      return `<h4 class="text-sm text-[#E0E4E8] font-medium mt-4 mb-2">${renderInline(block.lines[0])}</h4>`
    case 'h3':
      return `<h5 class="text-xs text-[#C0D0D0] font-medium uppercase tracking-wider mt-3 mb-1.5">${renderInline(block.lines[0])}</h5>`
    case 'hr':
      return `<hr class="my-4" style="border-color:rgba(0,224,160,0.15)" />`
    case 'ul':
      return `<ul class="list-disc list-outside ml-5 space-y-1 my-2 marker:text-[#5A8A7A]">${block.lines
        .map((li) => `<li>${renderInline(li)}</li>`)
        .join('')}</ul>`
    case 'ol':
      return `<ol class="list-decimal list-outside ml-5 space-y-1 my-2 marker:text-[#5A8A7A]">${block.lines
        .map((li) => `<li>${renderInline(li)}</li>`)
        .join('')}</ol>`
    case 'quote':
      return `<blockquote class="pl-3 my-3 text-[#9ED9C0]" style="border-left:2px solid rgba(0,224,160,0.4)">${renderInline(block.lines[0])}</blockquote>`
    case 'p':
    default:
      return `<p class="my-2 leading-relaxed">${renderInline(block.lines[0])}</p>`
  }
}

export function Markdown({ source }: { source: string }) {
  const html = blocksFrom(source).map(renderBlock).join('\n')
  return (
    <div
      className="text-[#8A9AAB] text-sm font-light"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
