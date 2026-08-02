// ── Colours & slot labels ──
const COLORS = ['#4f46e5','#0891b2','#d97706'];
const SLOT_LABELS = ['00:00–03:00','03:00–06:00','06:00–09:00','09:00–12:00',
                     '12:00–15:00','15:00–18:00','18:00–21:00','21:00–24:00'];

// ── Built-in presets (rates collected: 2026-08-02) ──
const PRESETS = [
  {
    id: 'preset-mercury-standard-flat',
    name: '20260802-Mercury-standard-Flat',
    data: {
      name: 'Mercury', peakDays: 'all',
      peakStart: 7, peakEnd: 23, peak2Start: 17, peak2End: 21.5,
      nonPeakDayRate: 'offpeak',
      wdPeakStart: 7, wdPeakEnd: 23, wePeakStart: 9, wePeakEnd: 21,
      weekdays: 21.5, weekends: 8.5,
      pkgs: [
        { name: 'Standard user - Flat rates', daily: 3.3235, isFlat: true,  peak: 0.2558,  offPeak: 0.2558,  enabled: true  },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
      ]
    }
  },
  {
    id: 'preset-mercury-standard-flex',
    name: '20260802-Mercury-standard-Flex',
    data: {
      name: 'Mercury', peakDays: 'dual',
      peakStart: 7, peakEnd: 11, peak2Start: 17, peak2End: 21.5,
      nonPeakDayRate: 'offpeak',
      wdPeakStart: 7, wdPeakEnd: 23, wePeakStart: 9, wePeakEnd: 21,
      weekdays: 21.5, weekends: 8.5,
      pkgs: [
        { name: 'Standard user - Flex rates', daily: 3.3235, isFlat: false, peak: 0.312, offPeak: 0.2108, enabled: true  },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
      ]
    }
  },
  {
    id: 'preset-genesis-peak',
    name: '20260802-Genisis-peak-hours',
    data: {
      name: 'Genisis', peakDays: 'all',
      peakStart: 7, peakEnd: 21, peak2Start: 17, peak2End: 21.5,
      nonPeakDayRate: 'offpeak',
      wdPeakStart: 7, wdPeakEnd: 21, wePeakStart: 9, wePeakEnd: 21,
      weekdays: 21.5, weekends: 8.5,
      pkgs: [
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
      ]
    }
  },
  {
    id: 'preset-genesis-standard-flat',
    name: '20260802-Genisis-standard-Flat',
    data: {
      name: 'Genisis', peakDays: 'all',
      peakStart: 7, peakEnd: 23, peak2Start: 17, peak2End: 21.5,
      nonPeakDayRate: 'offpeak',
      wdPeakStart: 7, wdPeakEnd: 23, wePeakStart: 9, wePeakEnd: 21,
      weekdays: 21.5, weekends: 8.5,
      pkgs: [
        { name: 'Standard user - Flat rates', daily: 2.6275, isFlat: true,  peak: 0.2853,  offPeak: 0.2853,  enabled: true  },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
      ]
    }
  },
  {
    id: 'preset-contact-good-charge',
    name: '20260802-Contact-Good-Charge',
    data: {
      name: 'Contact', peakDays: 'all',
      peakStart: 7, peakEnd: 21, peak2Start: 17, peak2End: 21.5,
      nonPeakDayRate: 'offpeak',
      wdPeakStart: 7, wdPeakEnd: 21, wePeakStart: 9, wePeakEnd: 21,
      weekdays: 21.5, weekends: 8.5,
      pkgs: [
        { name: 'Good Charge', daily: 3.566, isFlat: false, peak: 0.33005, offPeak: 0.161, enabled: true  },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
      ]
    }
  },
  {
    id: 'preset-contact-basic',
    name: '20260802-Contact-Basic',
    data: {
      name: 'Contact', peakDays: 'all',
      peakStart: 7, peakEnd: 23, peak2Start: 17, peak2End: 21.5,
      nonPeakDayRate: 'offpeak',
      wdPeakStart: 7, wdPeakEnd: 23, wePeakStart: 9, wePeakEnd: 21,
      weekdays: 21.5, weekends: 8.5,
      pkgs: [
        { name: 'Basic plan', daily: 3.221, isFlat: true, peak: 0.28279, offPeak: 0.28279, enabled: true  },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
      ]
    }
  },
  {
    id: 'preset-contact-standard-flat',
    name: '20260802-Contact-standard-Flat',
    data: {
      name: 'Contact', peakDays: 'all',
      peakStart: 7, peakEnd: 23, peak2Start: 17, peak2End: 21.5,
      nonPeakDayRate: 'offpeak',
      wdPeakStart: 7, wdPeakEnd: 23, wePeakStart: 9, wePeakEnd: 21,
      weekdays: 21.5, weekends: 8.5,
      pkgs: [
        { name: 'Standard user - Flat rates', daily: 3.221, isFlat: true, peak: 0.28279, offPeak: 0.28279, enabled: true  },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
        { name: '', daily: '', isFlat: false, peak: '', offPeak: '', enabled: false },
      ]
    }
  },
];
