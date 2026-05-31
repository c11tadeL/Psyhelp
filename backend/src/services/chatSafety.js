/**
 * chatSafety.js — фільтрація кризових тригерів і валідація відповідей
 */

const CRISIS_TRIGGERS = [
  // Суїцидальні думки
  'не хочу жити',
  'хочу вмерти',
  'краще б мене не було',
  'покінчити з життям',
  'покінчити з собою',
  'суїцид',
  'суїцидальн',
  'вбити себе',
  'накласти на себе руки',
  'зведу рахунки з життям',
  'немає сенсу жити',
  'не бачу сенсу жити',
  // Самоушкодження
  'порізати себе',
  'порізатись',
  'нашкодити собі',
  'заподіяти собі',
]

function detectCrisis(text) {
  const normalized = text.toLowerCase().trim()
  return CRISIS_TRIGGERS.some(trigger => normalized.includes(trigger))
}

function getCrisisResponse() {
  return `Я чую тебе, і мені важливо що ти написав це.

Зараз ти не один — є люди які готові вислухати і допомогти прямо зараз:

📞 **Lifeline Ukraine** — 7333 (безкоштовно, цілодобово)
📞 **Телефон довіри** — 0 800 100 102 (безкоштовно)
📞 **Екстрена допомога** — 103

Зателефонуй — там живі люди, не роботи. Вони не будуть тебе осуджувати.`
}

function validateResponse(text) {
  if (!text || text.trim().length < 5) return false
  if (text.length > 2000) return false
  return true
}

module.exports = { detectCrisis, getCrisisResponse, validateResponse }
