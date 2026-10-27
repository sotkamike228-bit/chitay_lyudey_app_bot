// Контакты помощи. Источники и даты проверки: release/chitay/горячие_линии_источники.md (проверено 26.10.2026).
// Не заменяют профессиональную помощь. Перед релизом перепроверить и согласовать с юристом/НКО.
export const HELP = {
  ru: {
    intro: 'Если вам или кому-то рядом угрожает опасность, позвоните в экстренную службу. Этот симулятор не оценивает реальных людей и не заменяет помощь специалиста.',
    items: [
      { name: 'Единый номер экстренных служб (Россия)', dial: '112', display: '112' },
      { name: 'Телефон психологической помощи МЧС России', dial: '+74959895050', display: '+7 (495) 989-50-50' },
      { name: 'Ла Страда-Україна, линия по домашнему насилию (Украина)', dial: '0800500335', display: '0 800 500 335' },
    ],
    note: 'Данные проверены 26.10.2026 по официальным сайтам. Если вы в другой стране, звоните в местную экстренную службу.',
  },
  en: {
    intro: 'If you or someone near you is in danger, call your local emergency number. This simulator does not assess real people and does not replace professional help.',
    items: [
      { name: 'Emergency services (US)', dial: '911', display: '911' },
      { name: 'National Domestic Violence Hotline (US)', dial: '18007997233', display: '1-800-799-7233' },
      { name: 'Emergency services (UK)', dial: '999', display: '999' },
      { name: 'National Domestic Abuse Helpline (UK)', dial: '08082000247', display: '0808 2000 247' },
      { name: 'Hilfetelefon (Germany)', dial: '116016', display: '116 016' },
    ],
    note: 'Checked on 2026-10-26 against official sites. In other countries call your local emergency number.',
  },
};
