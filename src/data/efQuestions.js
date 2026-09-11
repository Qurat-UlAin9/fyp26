/**
 * UEF-1 Executive Function questionnaire items.
 *
 * Source: Ramos-Galarza et al. (2023), Frontiers in Psychology --
 * "Executive functions scale for university students: UEF-1".
 * English translations below are direct translations of the original
 * Spanish items (extracted from ef_raw.sav variable labels), not a
 * separately validated English version. If literal translation reads
 * oddly in-app, note it, but don't reword the underlying claim being
 * measured -- that changes what's actually being scored.
 *
 * NOTE: several items reference "university tasks" / "the professor" --
 * this instrument was validated on a university-student population.
 * If your app's audience isn't students, decide explicitly whether to
 * keep the original wording (preserves validity) or adapt it (breaks
 * the tie to the validated instrument).
 *
 * Response scale (1-5, agreement):
 *   1 = Strongly disagree
 *   2 = Somewhat disagree
 *   3 = Neither agree nor disagree
 *   4 = Somewhat agree
 *   5 = Strongly agree
 */

export const EF_RESPONSE_OPTIONS = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Somewhat disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Somewhat agree' },
  { value: 5, label: 'Strongly agree' },
];

// Dimension display metadata -- status mirrors executiveFunctionScoring.js exactly.
export const EF_DIMENSIONS_META = {
  SistemaAtencionalSupervisor: {
    label: 'Supervisory Attentional System',
    status: 'partial',
  },
  RegulacionDeliberadaEmocion: {
    label: 'Deliberate Regulation of Emotion',
    status: 'partial',
  },
  MonitorizacionConscieteResponsabilidades: {
    label: 'Conscious Monitoring of Responsibilities',
    status: 'partial',
  },
  Verificaciondelaconducta: {
    label: 'Verification of Conduct',
    status: 'partial',
  },
  Organizacionelemnetostareas: {
    label: 'Organization of Elements for Tasks',
    status: 'exact',
  },
  Controlinhibitorio: {
    label: 'Inhibitory Control',
    status: 'partial',
  },
  tomadedecisiones: {
    label: 'Decision Making',
    status: 'partial',
  },
};

// Items in original questionnaire order (by item number). Each item is
// tagged with the single dimension it belongs to, matching both our data
// -driven recovery and the published paper's Table 4 CFA loadings.
export const EF_ITEMS = [
  { code: 'EF1', dimension: 'Organizacionelemnetostareas', text: 'I find it easy to pick up and leave my things tidy when asked to.' },
  { code: 'EF2', dimension: 'MonitorizacionConscieteResponsabilidades', text: 'I can finish a university task even when it is very long.' },
  { code: 'EF3', dimension: 'Controlinhibitorio', text: 'I always act while thinking through the consequences of my actions.' },
  { code: 'EF4', dimension: 'RegulacionDeliberadaEmocion', text: 'I control my emotions appropriately.' },
  { code: 'EF5', dimension: 'tomadedecisiones', text: 'I have the ability to make decisions independently.' },
  { code: 'EF6', dimension: 'Organizacionelemnetostareas', text: 'I keep my things in the right place and in order.' },
  { code: 'EF7', dimension: 'Organizacionelemnetostareas', text: 'I can quickly find my materials when looking for them in my room or at my desk.' },
  { code: 'EF8', dimension: 'MonitorizacionConscieteResponsabilidades', text: 'I can do my university assignments independently, without help from others.' },
  { code: 'EF9', dimension: 'MonitorizacionConscieteResponsabilidades', text: 'I successfully complete my university work.' },
  { code: 'EF10', dimension: 'SistemaAtencionalSupervisor', text: 'I have good concentration.' },
  { code: 'EF11', dimension: 'Controlinhibitorio', text: 'I can stay calm and still while waiting.' },
  { code: 'EF13', dimension: 'tomadedecisiones', text: 'I have the ability to solve problems both at university and in my personal life.' },
  { code: 'EF15', dimension: 'SistemaAtencionalSupervisor', text: 'I concentrate on my university activities, setting aside irrelevant things.' },
  { code: 'EF17', dimension: 'SistemaAtencionalSupervisor', text: 'I am able to maintain attention on an activity.' },
  { code: 'EF18', dimension: 'MonitorizacionConscieteResponsabilidades', text: 'I can do my work without anyone supervising me.' },
  { code: 'EF19', dimension: 'SistemaAtencionalSupervisor', text: 'I plan my university tasks ahead of time.' },
  { code: 'EF20', dimension: 'Controlinhibitorio', text: 'It is easy for me to behave appropriately at social gatherings.' },
  { code: 'EF21', dimension: 'Controlinhibitorio', text: 'When someone asks me to, I can easily stop doing something that distracts me.' },
  { code: 'EF22', dimension: 'Controlinhibitorio', text: 'I let others speak without interrupting.' },
  { code: 'EF23', dimension: 'Controlinhibitorio', text: 'I can anticipate the consequences of my actions.' },
  { code: 'EF24', dimension: 'Verificaciondelaconducta', text: 'I check that my university tasks are done well and error-free before submitting them to the professor.' },
  { code: 'EF26', dimension: 'tomadedecisiones', text: 'I can make decisions without difficulty, even about the most complicated things.' },
  { code: 'EF27', dimension: 'SistemaAtencionalSupervisor', text: 'It is easy for me to concentrate on my university activities.' },
  { code: 'EF31', dimension: 'Verificaciondelaconducta', text: 'I check the spelling and writing of my university assignments before finishing them.' },
  { code: 'EF33', dimension: 'Verificaciondelaconducta', text: 'I remember to bring home my university tasks, materials, or assignments.' },
  { code: 'EF34', dimension: 'RegulacionDeliberadaEmocion', text: 'I stay calm easily.' },
  { code: 'EF37', dimension: 'Organizacionelemnetostareas', text: 'I clean up my own mess without others doing it for me.' },
  { code: 'EF38', dimension: 'MonitorizacionConscieteResponsabilidades', text: 'I finish my university tasks on time.' },
  { code: 'EF39', dimension: 'SistemaAtencionalSupervisor', text: 'I maintain good study habits.' },
  { code: 'EF40', dimension: 'RegulacionDeliberadaEmocion', text: 'I have a stable mood.' },
  { code: 'EF41', dimension: 'Verificaciondelaconducta', text: 'When I finish a university activity, I check that I achieved what I planned.' },
  { code: 'EF42', dimension: 'RegulacionDeliberadaEmocion', text: 'I am able to control my emotions.' },
];
