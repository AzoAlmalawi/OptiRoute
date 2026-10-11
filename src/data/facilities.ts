import { Facility, FacilityTier } from '../types/triage';

export const DEMO_CITIES = [
  { id: 'riyadh', nameAr: 'الرياض', nameEn: 'Riyadh', coords: { lat: 24.7136, lng: 46.6753 } },
  { id: 'alahsa', nameAr: 'الأحساء / الهفوف', nameEn: 'Al-Ahsa / Hofuf', coords: { lat: 25.3833, lng: 49.5833 } },
  { id: 'dammam', nameAr: 'الدمام / الخبر', nameEn: 'Dammam / Khobar', coords: { lat: 26.4207, lng: 50.0888 } },
  { id: 'jeddah', nameAr: 'جدة', nameEn: 'Jeddah', coords: { lat: 21.4858, lng: 39.1925 } },
];

/**
 * Clearly fictional demo healthcare facilities.
 * Replaces any real hospital names with fictional demo records.
 * Phone numbers are disabled demo numbers.
 * Every facility is explicitly tagged with its capability tier:
 * - EMERGENCY: emergency eye-care facility (24/7 acute trauma / emergency department)
 * - URGENT: facility configured for same-day eye assessment
 * - NON_URGENT: fictional primary-care facility or routine eye clinic
 */
export const DEMO_FACILITIES: Facility[] = [
  // --- RIYADH ---
  {
    id: 'fac-demo-emerg-a',
    nameAr: 'مركز طوارئ العيون الافتراضي — مبنى أ (منشأة تجريبية)',
    nameEn: 'Demo Ophthalmic Emergency Center Alpha (Fictional Facility)',
    typeAr: 'مركز طوارئ عيون افتراضي (24/7)',
    typeEn: 'Simulated Tertiary Eye Emergency (24/7)',
    city: 'Riyadh',
    distanceKm: 4.2,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: true,
    tier: 'EMERGENCY',
    supportedUrgencies: ['EMERGENCY'],
    operatingHoursAr: 'متاح على مدار 24 ساعة يومياً (طوارئ عيون تجريبية)',
    operatingHoursEn: '24/7 Emergency Eye Care Department (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'شارع المنشآت التجريبية، الرياض (عنوان افتراضي)',
    addressEn: 'Demo Health District St, Riyadh (Fictional Address)',
    coordinates: { lat: 24.7083, lng: 46.6612 },
  },
  {
    id: 'fac-demo-urgent-riyadh',
    nameAr: 'عيادات الفحص العاجل للعيون التجريبية — الرياض (منشأة تجريبية)',
    nameEn: 'Demo Urgent Eye Assessment Clinic Riyadh (Fictional Facility)',
    typeAr: 'عيادات تقييم عيون عاجل في اليوم نفسه (افتراضية)',
    typeEn: 'Simulated Same-Day Acute Eye Assessment Clinic',
    city: 'Riyadh',
    distanceKm: 3.5,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: false,
    tier: 'URGENT',
    supportedUrgencies: ['URGENT'],
    operatingHoursAr: 'تقييم الحالات العاجلة في اليوم نفسه: 8:00 ص – 11:00 م (افتراضي)',
    operatingHoursEn: 'Same-day urgent assessment: 8:00 AM – 11:00 PM (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'طريق التقييم العاجل، الرياض (عنوان افتراضي)',
    addressEn: 'Demo Urgent Care Ave, Riyadh (Fictional Address)',
    coordinates: { lat: 24.72, lng: 46.685 },
  },
  {
    id: 'fac-demo-phc-e',
    nameAr: 'مركز الرعاية الأولية التجريبي — وحدة هـ (منشأة تجريبية)',
    nameEn: 'Demo Primary Health Center Epsilon (Fictional Facility)',
    typeAr: 'مركز رعاية صحية أولية افتراضي',
    typeEn: 'Simulated Primary Healthcare Clinic',
    city: 'Riyadh',
    distanceKm: 2.4,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: false,
    tier: 'NON_URGENT',
    supportedUrgencies: ['NON_URGENT'],
    operatingHoursAr: 'يومياً من 8:00 صباحاً حتى 10:00 مساءً (افتراضي)',
    operatingHoursEn: 'Daily 8:00 AM – 10:00 PM (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'حي الرعاية التجريبي، الرياض (عنوان افتراضي)',
    addressEn: 'Demo Community Park, Riyadh (Fictional Address)',
    coordinates: { lat: 24.665, lng: 46.728 },
  },

  // --- AL-AHSA / HOFUF ---
  {
    id: 'fac-demo-trauma-b',
    nameAr: 'وحدة إصابات العيون التجريبية — مبنى ب (منشأة تجريبية)',
    nameEn: 'Demo Regional Eye Trauma Unit Beta (Fictional Facility)',
    typeAr: 'مستشفى إصابات عيون إقليمي افتراضي (طوارئ 24/7)',
    typeEn: 'Simulated Regional Eye Emergency (24/7)',
    city: 'Al-Ahsa / Hofuf',
    distanceKm: 5.1,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: true,
    tier: 'EMERGENCY',
    supportedUrgencies: ['EMERGENCY'],
    operatingHoursAr: 'متاح 24/7 لاستقبال طوارئ العيون الافتراضية',
    operatingHoursEn: '24/7 Ophthalmic Trauma & Emergency (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'مجمع العيادات التجريبية، الهفوف (عنوان افتراضي)',
    addressEn: 'Demo Clinic Complex, Hofuf (Fictional Address)',
    coordinates: { lat: 25.3621, lng: 49.5632 },
  },
  {
    id: 'fac-demo-clinic-f',
    nameAr: 'عيادات العيون المجتمعية التجريبية — وحدة و (منشأة تجريبية)',
    nameEn: 'Demo Community Eye Outpatient Clinic Zeta (Fictional Facility)',
    typeAr: 'عيادات تقييم عيون عاجل في اليوم نفسه افتراضية',
    typeEn: 'Simulated Same-Day Acute Eye Assessment Clinic',
    city: 'Al-Ahsa / Hofuf',
    distanceKm: 3.1,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: false,
    tier: 'URGENT',
    supportedUrgencies: ['URGENT'],
    operatingHoursAr: 'فحص الحالات العاجلة: السبت - الخميس: 9:00 ص - 9:00 م (افتراضي)',
    operatingHoursEn: 'Same-day urgent assessment: Sat - Thu: 9:00 AM - 9:00 PM (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'شارع العيادات الافتراضية، الهفوف (عنوان افتراضي)',
    addressEn: 'Demo Ambulatory St, Hofuf (Fictional Address)',
    coordinates: { lat: 25.375, lng: 49.589 },
  },
  {
    id: 'fac-demo-phc-alahsa',
    nameAr: 'مركز الرعاية الأولية وطب العيون الروتيني التجريبي — الأحساء (منشأة تجريبية)',
    nameEn: 'Demo Primary Care & Routine Eye Clinic Al-Ahsa (Fictional Facility)',
    typeAr: 'مركز رعاية صحية أولية وعيادة عيون روتينية افتراضية',
    typeEn: 'Simulated Primary Healthcare & Routine Eye Clinic',
    city: 'Al-Ahsa / Hofuf',
    distanceKm: 4.0,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: false,
    tier: 'NON_URGENT',
    supportedUrgencies: ['NON_URGENT'],
    operatingHoursAr: 'السبت - الخميس: 8:00 ص – 6:00 م (رعاية روتينية افتراضية)',
    operatingHoursEn: 'Sat - Thu: 8:00 AM – 6:00 PM (Routine Eye Care — Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'شارع الرعاية الأولية، الهفوف (عنوان افتراضي)',
    addressEn: 'Demo Primary Health Rd, Hofuf (Fictional Address)',
    coordinates: { lat: 25.37, lng: 49.575 },
  },

  // --- DAMMAM / KHOBAR ---
  {
    id: 'fac-demo-eye-c',
    nameAr: 'مركز العيون التخصصي الافتراضي — مبنى ج (منشأة تجريبية)',
    nameEn: 'Demo Specialized Eye Center Gamma (Fictional Facility)',
    typeAr: 'مركز طوارئ عيون تخصصي متقدم افتراضي',
    typeEn: 'Simulated Specialized Eye Emergency Center',
    city: 'Dammam / Khobar',
    distanceKm: 3.8,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: true,
    tier: 'EMERGENCY',
    supportedUrgencies: ['EMERGENCY'],
    operatingHoursAr: 'طوارئ عيون تجريبية 24 ساعة',
    operatingHoursEn: '24/7 Emergency Service (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'طريق المحاكاة، الدمام (عنوان افتراضي)',
    addressEn: 'Demo Medical Way, Dammam (Fictional Address)',
    coordinates: { lat: 26.435, lng: 50.103 },
  },
  {
    id: 'fac-demo-urgent-dammam',
    nameAr: 'عيادات الفحص العاجل للعيون التجريبية — الدمام (منشأة تجريبية)',
    nameEn: 'Demo Urgent Eye Assessment Clinic Dammam (Fictional Facility)',
    typeAr: 'عيادات تقييم عيون عاجل في اليوم نفسه افتراضية',
    typeEn: 'Simulated Same-Day Acute Eye Assessment Clinic',
    city: 'Dammam / Khobar',
    distanceKm: 4.6,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: false,
    tier: 'URGENT',
    supportedUrgencies: ['URGENT'],
    operatingHoursAr: 'تقييم الحالات العاجلة في اليوم نفسه: 8:00 ص – 10:00 م (افتراضي)',
    operatingHoursEn: 'Same-day urgent assessment: 8:00 AM – 10:00 PM (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'طريق الخليج الافتراضي، الدمام (عنوان افتراضي)',
    addressEn: 'Demo Gulf Coast Way, Dammam (Fictional Address)',
    coordinates: { lat: 26.428, lng: 50.095 },
  },
  {
    id: 'fac-demo-phc-dammam',
    nameAr: 'مركز الرعاية الأولية وطب العيون الروتيني التجريبي — الدمام (منشأة تجريبية)',
    nameEn: 'Demo Primary Care & Routine Eye Clinic Dammam (Fictional Facility)',
    typeAr: 'مركز رعاية صحية أولية وعيادة عيون روتينية افتراضية',
    typeEn: 'Simulated Primary Healthcare & Routine Eye Clinic',
    city: 'Dammam / Khobar',
    distanceKm: 5.2,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: false,
    tier: 'NON_URGENT',
    supportedUrgencies: ['NON_URGENT'],
    operatingHoursAr: 'يومياً عدا الجمعة: 8:00 ص – 8:00 م (رعاية أولية افتراضية)',
    operatingHoursEn: 'Daily except Friday: 8:00 AM – 8:00 PM (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'شارع الخدمات الأولية، الخبر (عنوان افتراضي)',
    addressEn: 'Demo Routine Health St, Khobar (Fictional Address)',
    coordinates: { lat: 26.415, lng: 50.11 },
  },

  // --- JEDDAH ---
  {
    id: 'fac-demo-univ-d',
    nameAr: 'طوارئ العيون الجامعية التجريبية — مبنى د (منشأة تجريبية)',
    nameEn: 'Demo University Eye Emergency Delta (Fictional Facility)',
    typeAr: 'طوارئ عيون جامعية متقدمة افتراضية',
    typeEn: 'Simulated University Emergency Center',
    city: 'Jeddah',
    distanceKm: 6.5,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: true,
    tier: 'EMERGENCY',
    supportedUrgencies: ['EMERGENCY'],
    operatingHoursAr: 'طوارئ عيون 24 ساعة (محاكاة)',
    operatingHoursEn: '24/7 Acute Eye Triage (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'حي الأبحاث التجريبي، جدة (عنوان افتراضي)',
    addressEn: 'Demo Campus District, Jeddah (Fictional Address)',
    coordinates: { lat: 21.493, lng: 39.245 },
  },
  {
    id: 'fac-demo-urgent-jeddah',
    nameAr: 'عيادات التقييم العاجل للعيون التجريبية — جدة (منشأة تجريبية)',
    nameEn: 'Demo Urgent Eye Assessment Clinic Jeddah (Fictional Facility)',
    typeAr: 'عيادات تقييم عيون عاجل في اليوم نفسه افتراضية',
    typeEn: 'Simulated Same-Day Acute Eye Assessment Clinic',
    city: 'Jeddah',
    distanceKm: 5.0,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: false,
    tier: 'URGENT',
    supportedUrgencies: ['URGENT'],
    operatingHoursAr: 'فحص الحالات العاجلة خلال اليوم نفسه: 8:00 ص – 11:00 م (افتراضي)',
    operatingHoursEn: 'Same-day urgent eye assessment: 8:00 AM – 11:00 PM (Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'طريق التقييم التخصصي، جدة (عنوان افتراضي)',
    addressEn: 'Demo Specialized Medical Way, Jeddah (Fictional Address)',
    coordinates: { lat: 21.505, lng: 39.215 },
  },
  {
    id: 'fac-demo-phc-jeddah',
    nameAr: 'مركز الرعاية الأولية وطب العيون الروتيني التجريبي — جدة (منشأة تجريبية)',
    nameEn: 'Demo Primary Care & Routine Eye Clinic Jeddah (Fictional Facility)',
    typeAr: 'مركز رعاية صحية أولية وعيادة عيون روتينية افتراضية',
    typeEn: 'Simulated Primary Healthcare & Routine Eye Clinic',
    city: 'Jeddah',
    distanceKm: 3.8,
    isCalculatedDistance: false,
    hasEmergencyEyeCare: false,
    tier: 'NON_URGENT',
    supportedUrgencies: ['NON_URGENT'],
    operatingHoursAr: 'الأحد - الخميس: 8:00 ص – 9:00 م (رعاية روتينية وأولية افتراضية)',
    operatingHoursEn: 'Sun - Thu: 8:00 AM – 9:00 PM (Routine Care — Simulated)',
    phone: '000-000-0000 (سجل افتراضي — الاتصال معطل)',
    addressAr: 'شارع الرعاية المجتمعية، جدة (عنوان افتراضي)',
    addressEn: 'Demo Community Wellness Ave, Jeddah (Fictional Address)',
    coordinates: { lat: 21.49, lng: 39.18 },
  },
];

/**
 * Calculates distance between two coordinates using the Haversine formula
 */
function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Validates whether a facility satisfies the required clinical urgency capability:
 * - EMERGENCY: emergency eye-care facility (24/7 acute trauma / emergency care)
 * - URGENT: facility configured for same-day eye assessment
 * - NON_URGENT: fictional primary-care facility or routine eye clinic
 */
export function isFacilitySuitableForUrgency(
  facility: Facility,
  urgency: 'EMERGENCY' | 'URGENT' | 'NON_URGENT'
): boolean {
  if (facility.supportedUrgencies && facility.supportedUrgencies.length > 0) {
    return facility.supportedUrgencies.includes(urgency);
  }
  if (facility.tier) {
    return facility.tier === urgency;
  }
  if (urgency === 'EMERGENCY') {
    return facility.hasEmergencyEyeCare === true;
  }
  if (urgency === 'URGENT') {
    return (
      !facility.hasEmergencyEyeCare &&
      (facility.typeEn.toLowerCase().includes('same-day') ||
        facility.typeEn.toLowerCase().includes('urgent') ||
        facility.typeEn.toLowerCase().includes('outpatient'))
    );
  }
  if (urgency === 'NON_URGENT') {
    return (
      !facility.hasEmergencyEyeCare &&
      (facility.typeEn.toLowerCase().includes('primary') ||
        facility.typeEn.toLowerCase().includes('routine'))
    );
  }
  return false;
}

/**
 * Checks city match with bilingual tolerance (English / Arabic city names)
 */
export function cityMatchesUserCity(facilityCity: string, userCity: string): boolean {
  const normUser = userCity.trim().toLowerCase();
  const normFac = facilityCity.trim().toLowerCase();

  if (normFac.includes(normUser) || normUser.includes(normFac)) return true;

  const isRiyadh = normUser.includes('riyadh') || normUser.includes('رياض');
  if (isRiyadh && normFac.includes('riyadh')) return true;

  const isAhsa =
    normUser.includes('ahsa') ||
    normUser.includes('hofuf') ||
    normUser.includes('أحساء') ||
    normUser.includes('احساء') ||
    normUser.includes('هفوف');
  if (isAhsa && (normFac.includes('ahsa') || normFac.includes('hofuf'))) return true;

  const isDammam =
    normUser.includes('dammam') ||
    normUser.includes('khobar') ||
    normUser.includes('دمام') ||
    normUser.includes('خبر');
  if (isDammam && (normFac.includes('dammam') || normFac.includes('khobar'))) return true;

  const isJeddah =
    normUser.includes('jeddah') || normUser.includes('جدة') || normUser.includes('جده');
  if (isJeddah && normFac.includes('jeddah')) return true;

  return false;
}

export interface FacilityRoutingResult {
  facility?: Facility;
  isSuitableMatch: boolean;
  urgency: 'EMERGENCY' | 'URGENT' | 'NON_URGENT';
  requestedCity: string;
  explanationAr: string;
  explanationEn: string;
}

/**
 * Finds recommended fictional facility based on urgency and user location.
 *
 * CRITICAL SAFETY RULES:
 * 1. Filter by suitable facility capability BEFORE applying location or distance selection.
 *    - NON_URGENT -> primary-care facility or routine eye clinic (never emergency)
 *    - URGENT -> facility configured for same-day eye assessment
 *    - EMERGENCY -> emergency eye-care facility (24/7)
 * 2. If no suitable demo facility exists in the selected city, explain that instead
 *    of silently recommending an unsuitable facility.
 */
export function getRecommendedFacility(
  urgency: 'EMERGENCY' | 'URGENT' | 'NON_URGENT',
  userCity: string = 'Riyadh',
  userCoords?: { lat: number; lng: number }
): FacilityRoutingResult {
  // Step 1: Filter ALL facilities by suitable capability FIRST
  const suitableFacilities = DEMO_FACILITIES.filter((f) =>
    isFacilitySuitableForUrgency(f, urgency)
  );

  // Step 2: From suitable facilities, filter by the requested city
  const cityMatches = suitableFacilities.filter((f) =>
    cityMatchesUserCity(f.city, userCity)
  );

  // Step 3: Handle city-level absence of suitable facility
  if (cityMatches.length === 0) {
    const urgencyDescAr =
      urgency === 'EMERGENCY'
        ? 'طوارئ عيون فورية (24/7)'
        : urgency === 'URGENT'
        ? 'تقييم عيون عاجل في اليوم نفسه'
        : 'رعاية صحية أولية أو عيادة عيون روتينية';
    const urgencyDescEn =
      urgency === 'EMERGENCY'
        ? 'immediate ophthalmic emergency care (24/7)'
        : urgency === 'URGENT'
        ? 'same-day acute eye assessment'
        : 'primary care or routine eye consultation';

    const guidanceAr =
      urgency === 'EMERGENCY'
        ? 'يُرجى الاتصال بالإسعاف (997) فوراً أو التوجه إلى أقرب طوارئ عامة.'
        : urgency === 'URGENT'
        ? 'يُرجى مراجعة عيادة عيون تخصصية معتمدة لإجراء تقييم عاجل في اليوم نفسه.'
        : 'يُرجى حجز موعد لدى أقرب مركز رعاية صحية أولية لتلقي الرعاية الروتينية.';
    const guidanceEn =
      urgency === 'EMERGENCY'
        ? 'Please call 997 immediately or proceed to the nearest emergency department.'
        : urgency === 'URGENT'
        ? 'Please visit a certified eye specialty clinic for urgent same-day evaluation.'
        : 'Please consult the nearest primary healthcare center for routine consultation.';

    return {
      facility: undefined,
      isSuitableMatch: false,
      urgency,
      requestedCity: userCity,
      explanationAr: `لا توجد منشأة تجريبية مهيأة لـ (${urgencyDescAr}) في مدينة "${userCity}". ${guidanceAr}`,
      explanationEn: `No suitable demo facility configured for ${urgencyDescEn} is available in "${userCity}". ${guidanceEn}`,
    };
  }

  // Step 4: Pick best match (closest if coordinates provided, else first)
  let selected = cityMatches[0];
  if (userCoords) {
    let minDistance = Infinity;
    for (const f of cityMatches) {
      const d = calculateHaversineKm(
        userCoords.lat,
        userCoords.lng,
        f.coordinates.lat,
        f.coordinates.lng
      );
      if (d < minDistance) {
        minDistance = d;
        selected = f;
      }
    }
  }

  // Clone to avoid mutating static fixture
  const facilityCopy: Facility = { ...selected };

  if (userCoords) {
    facilityCopy.distanceKm = calculateHaversineKm(
      userCoords.lat,
      userCoords.lng,
      facilityCopy.coordinates.lat,
      facilityCopy.coordinates.lng
    );
    facilityCopy.isCalculatedDistance = true;
  } else {
    facilityCopy.isCalculatedDistance = false;
  }

  const capabilityLabelAr =
    urgency === 'EMERGENCY'
      ? 'منشأة طوارئ عيون تجريبية'
      : urgency === 'URGENT'
      ? 'منشأة فحص عاجل في اليوم نفسه تجريبية'
      : 'منشأة رعاية أولية / عيادة عيون روتينية تجريبية';
  const capabilityLabelEn =
    urgency === 'EMERGENCY'
      ? 'simulated emergency eye-care facility'
      : urgency === 'URGENT'
      ? 'simulated same-day eye assessment facility'
      : 'simulated primary-care / routine eye facility';

  return {
    facility: facilityCopy,
    isSuitableMatch: true,
    urgency,
    requestedCity: userCity,
    explanationAr: `تم توجيه الحالة إلى ${facilityCopy.nameAr} (${capabilityLabelAr}) في ${facilityCopy.city}.`,
    explanationEn: `Routed patient to ${facilityCopy.nameEn} (${capabilityLabelEn}) in ${facilityCopy.city}.`,
  };
}
