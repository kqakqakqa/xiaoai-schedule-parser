const schs = Object.values((await(await fetch(
  "https://open-schedule-prod.ai.xiaomi.com/api/v2/client/school",
  {
    "headers": {
      "requestid": "",
      "x-user-id": "0"
    }
  }
)).json()).message).flat()

const prs = []

for (const sch of schs) {
  console.log(`fetching ${prs.length + 1} / ${schs.length}: ${sch.name}`)
  prs.push(...(await(await fetch(
    `https://open-schedule-prod.ai.xiaomi.com/api/v2/client/project/_search?sid=${sch.id}`,
    {
      "headers": {
        "requestid": "",
        "x-user-id": "0"
      }
    }
  )).json()).message)
}

const prsdl = prs.map(e => ({
  school_id: e.school.id,
  project_id: e.project.id,
  edition_id: e.edition.id,
  school: e.school.name,
  project: e.project.name,
  url: e.school.url,
  eas: e.project.eas,
  features: `${e.edition.features} *${e.edition.tips}`,
  rank: calculateScore(e.edition.positive, e.edition.ordinary, e.edition.negative),
  ranks: `🔺${e.edition.positive} 🔸${e.edition.ordinary} 🔻${e.edition.negative}`,
  usage: `${e.edition.usage}人使用`,
  time: (new Date(e.edition.updatedTime * 1000)).toISOString().replace("T", " ").substring(0, 19),
  coder_id: e.coder.id,
  coder: e.coder.coderName,
}))

function calculateScore(pos, ord, neg) {
  const weightedNeg = neg * 5
  const count = pos + ord + weightedNeg
  if (count === 0) return "🟦 无评分"
  const rank = (pos * 10 + ord * 7.5 + weightedNeg * 0) / count
  let label
  if (rank > 7.5) label = "🟩"
  else if (rank > 5) label = "🟨"
  else label = "🟥"

  return `${label} ${rank.toFixed(1)}分`
}

const url = URL.createObjectURL(new Blob([JSON.stringify(prsdl)], { type: "application/json" }))
const a = document.createElement("a")
a.href = url
a.download = "prs.json"
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url)