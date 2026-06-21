export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'neck'
  | 'cardio'
  | 'other'

/** Explicit map for the exercises present in the user's Hevy export. */
const EXPLICIT: Record<string, MuscleGroup> = {
  'Bench Press (Barbell)': 'chest',
  'Bench Press (Dumbbell)': 'chest',
  'Decline Bench Press (Machine)': 'chest',
  'Incline Bench Press (Barbell)': 'chest',
  'Incline Bench Press (Dumbbell)': 'chest',
  'Incline Chest Fly (Dumbbell)': 'chest',
  'Incline Chest Press (Machine)': 'chest',
  'Bent Over Row (Barbell)': 'back',
  'Chest Supported Incline Row (Dumbbell)': 'back',
  'Iso-Lateral Row (Machine)': 'back',
  'Landmine Row': 'back',
  'Lat Pulldown (Cable)': 'back',
  'Lat Pulldown - Close Grip (Cable)': 'back',
  'Meadows Rows (Barbell)': 'back',
  'Pull Up': 'back',
  'Seated Cable Row - Bar Grip': 'back',
  'Straight Arm Lat Pulldown (Cable)': 'back',
  'Deadlift (Barbell)': 'back',
  'Deadlift (Dumbbell)': 'back',
  'Face Pull': 'shoulders',
  'Lateral Raise (Dumbbell)': 'shoulders',
  'Overhead Press (Barbell)': 'shoulders',
  'Overhead Press (Dumbbell)': 'shoulders',
  'Shoulder Press (Dumbbell)': 'shoulders',
  'Single Arm Lateral Raise (Cable)': 'shoulders',
  'Upright Row (Barbell)': 'shoulders',
  'Concentration Curl': 'biceps',
  'Cross Body Hammer Curl': 'biceps',
  'Preacher Curl (Barbell)': 'biceps',
  'Preacher Curl (Machine)': 'biceps',
  'Seated Incline Curl (Dumbbell)': 'biceps',
  'Triceps Extension (Dumbbell)': 'triceps',
  'Triceps Pushdown': 'triceps',
  'Triceps Rope Pushdown': 'triceps',
  'Leg Extension (Machine)': 'quads',
  'Leg Press (Machine)': 'quads',
  'Squat (Barbell)': 'quads',
  'Squat (Smith Machine)': 'quads',
  'Lying Leg Curl (Machine)': 'hamstrings',
  'Standing Leg Curls': 'hamstrings',
  'Straight Leg Deadlift': 'hamstrings',
  'Calf Press (Machine)': 'calves',
  'Standing Calf Raise (Smith)': 'calves',
  'Cable Crunch': 'abs',
  'Crunch (Machine)': 'abs',
  'Lying Neck Curls (Weighted)': 'neck',
  'Lying Neck Extension (Weighted)': 'neck',
  'Cycling': 'cardio',
  'Treadmill': 'cardio',
  'Walking': 'cardio',
}

/** Ordered keyword rules used when an exercise isn't in the explicit map. */
const KEYWORDS: [RegExp, MuscleGroup][] = [
  [/cycl|treadmill|walk|run|elliptical|row(ing)? machine/i, 'cardio'],
  [/neck/i, 'neck'],
  [/calf|calves/i, 'calves'],
  [/leg curl|hamstring|lying.*curl|romanian|rdl|straight leg/i, 'hamstrings'],
  [/squat|leg press|leg extension|lunge|hack/i, 'quads'],
  [/glute|hip thrust/i, 'glutes'],
  [/crunch|sit.?up|ab |plank|abdominal/i, 'abs'],
  [/tricep|pushdown|skull|dip/i, 'triceps'],
  [/curl/i, 'biceps'],
  [/lateral raise|overhead press|shoulder press|face pull|delt|upright row/i, 'shoulders'],
  [/row|pulldown|pull up|pull-up|chin up|deadlift|lat /i, 'back'],
  [/bench|chest|fly|press|push up/i, 'chest'],
]

/** Map an exercise title to its primary muscle group. */
export function classifyExercise(title: string): MuscleGroup {
  if (EXPLICIT[title]) return EXPLICIT[title]
  for (const [re, group] of KEYWORDS) if (re.test(title)) return group
  return 'other'
}
