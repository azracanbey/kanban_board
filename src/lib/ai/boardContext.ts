export function buildBoardContext(board: any, columns: any[], cards: any[]) {
  return `
Mevcut board durumu:
Board adı: ${board.title}
Board ID: ${board.id}

Sütunlar ve kartlar:
${columns.map(col => `
Sütun: "${col.title}" (ID: ${col.id})
Kartlar:
${cards
  .filter(c => c.column_id === col.id)
  .sort((a, b) => a.position - b.position)
  .map(c => `  - "${c.title}" (ID: ${c.id})${c.description ? ` | Açıklama: ${c.description}` : ''}`)
  .join('\n') || '  (boş)'}
`).join('\n')}

Kullanıcının komutuna göre uygun tool'u çağır.
Eğer bir işlem yapıyorsan, yaptığın işlemi kısaca Türkçe açıkla.
Eğer sadece soru soruyorsa veya özet istiyorsa tool çağırma, direkt yanıt ver.
Yanıtların kısa ve net olsun.
  `.trim()
}
