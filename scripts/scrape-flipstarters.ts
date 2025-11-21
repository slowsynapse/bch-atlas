import puppeteer from 'puppeteer'
import * as fs from 'fs'

async function scrapeFlipstarters() {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  
  await page.goto('https://flipstarters.bitcoincash.network/#/completed', {
    waitUntil: 'networkidle0'
  })
  
  const campaigns = await page.evaluate(async () => {
    const allCampaigns: any[] = []
    const seenUrls = new Set<string>()
    
    function extractCurrentPage() {
      const campaigns: any[] = []
      const sections = document.querySelectorAll('div[data-v-2e117772]')
      
      for (const section of sections) {
        const text = section.textContent || ''
        const heading = section.querySelector('h1, h2, h3, h4, h5')
        
        if (heading && !heading.textContent?.includes('Flipstarters') && 
            !heading.textContent?.includes('Completed')) {
          const title = heading.textContent?.trim() || ''
          const hasStatus = text.includes('Status:')
          
          if (hasStatus && title) {
            const statusMatch = text.match(/Status:\s*(Success|Expired|Active)/i)
            const status = statusMatch ? statusMatch[1].toLowerCase() : 'unknown'
            
            const amountMatch = text.match(/Requesting:\s*(\d+\.?\d*)\s*BCH/i)
            const amount = amountMatch ? parseFloat(amountMatch[1]) : 0
            
            const link = section.querySelector('a[href*="fund"], a[href*="flipstarter"], a[href*="cash"]') as HTMLAnchorElement
            const url = link ? link.href : ''
            
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url)
              
              const categoryMatch = text.match(/Categories?:\s*([^\n]+)/i)
              const categories = categoryMatch ? categoryMatch[1].split(/\s+/).filter(c => c.startsWith('#')).map(c => c.slice(1)) : []
              
              const descMatch = text.match(/Description:\s*([^\n]+(?:\n(?!Categories|Requesting)[^\n]+)*)/i)
              const description = descMatch ? descMatch[1].trim() : ''
              
              campaigns.push({ title, status, amount, url, category: categories, description })
            }
          }
        }
      }
      return campaigns
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const successToggle = document.querySelector('input[value="success"]') as HTMLInputElement
    const expiredToggle = document.querySelector('input[value="expired"]') as HTMLInputElement
    
    if (successToggle && !successToggle.checked) successToggle.click()
    if (expiredToggle && !expiredToggle.checked) expiredToggle.click()
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    allCampaigns.push(...extractCurrentPage())
    
    for (let page = 2; page <= 20; page++) {
      const pageButton = Array.from(document.querySelectorAll('.page-link'))
        .find(b => b.textContent?.trim() === String(page)) as HTMLElement
      
      if (!pageButton || pageButton.classList.contains('disabled')) break
      
      pageButton.click()
      await new Promise(resolve => setTimeout(resolve, 2500))
      window.scrollTo(0, document.body.scrollHeight)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newCampaigns = extractCurrentPage()
      allCampaigns.push(...newCampaigns)

      if (newCampaigns.length === 0) break
    }
    
    return allCampaigns
  })
  
  await browser.close()
  return campaigns
}

scrapeFlipstarters().then(campaigns => {
  console.log(`Scraped ${campaigns.length} campaigns`)
  fs.writeFileSync('data/flipstarters-scraped.json', JSON.stringify(campaigns, null, 2))
  console.log('Saved to data/flipstarters-scraped.json')
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
