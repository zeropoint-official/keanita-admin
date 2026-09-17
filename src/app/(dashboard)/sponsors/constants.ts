// Display map — the form only offers the two game triggers; the legacy enum
// values stay here so old rows still render a label in the tables.
export const TRIGGER_LABEL: Record<string, string> = {
  game_milestone: 'Ορόσημο πόντων',
  game_drop: 'Τυχαία εμφάνιση',
  kp_claim: 'Εξαργύρωση με KP (παλιό)',
  streak: 'Σερί ημερών (παλιό)',
  event_attendance: 'Παρουσία σε εκδήλωση (παλιό)',
  manual: 'Χειροκίνητα (παλιό)',
};

export const QUOTA_LABEL: Record<string, string> = {
  total: 'συνολικά',
  monthly: 'ανά μήνα',
  weekly: 'ανά εβδομάδα',
};

export const FULFILLMENT_LABEL: Record<string, string> = {
  pickup: 'Παραλαβή',
  code: 'Κωδικός',
};
