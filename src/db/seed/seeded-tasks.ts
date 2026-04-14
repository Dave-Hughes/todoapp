export type SeededTaskData = {
  name: string;
  defaultPoints: number;
  suggestedCategory: string | null;
};

export const SEEDED_TASKS: SeededTaskData[] = [
  // Home — quick (5 pts)
  { name: "Take out trash", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Take out recycling", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Unload dishwasher", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Load dishwasher", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Wipe down counters", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Make the bed", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Water the plants", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Feed the pet", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Let the dog out", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Scoop the litter box", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Sweep the kitchen", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Empty the coffee grounds", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Start a load of laundry", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Switch laundry to dryer", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Fold laundry", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Put away laundry", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Wipe bathroom mirror", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Replace toilet paper roll", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Replace hand towels", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Check the mail", defaultPoints: 5, suggestedCategory: "Errands" },

  // Home — medium (15 pts)
  { name: "Vacuum the living room", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Vacuum the whole house", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Mop the floors", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Clean the bathroom", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Deep clean the bathroom", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Clean the kitchen", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Scrub the stove", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Clean the fridge", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Clean the microwave", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Clean the oven", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Dust the shelves", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Change the sheets", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Wash the sheets", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Wash the towels", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Clean the windows", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Organize the closet", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Organize the pantry", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Organize the junk drawer", defaultPoints: 15, suggestedCategory: "Home" },

  // Outdoor (15–30 pts)
  { name: "Mow the lawn", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Edge the lawn", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Rake and bag leaves", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Shovel the driveway", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Salt the walkway", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Water the garden", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Weed the garden", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Trim the hedges", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Clean the gutters", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Wash the car", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Take out yard waste", defaultPoints: 5, suggestedCategory: "Home" },

  // Errands (5–15 pts)
  { name: "Get groceries", defaultPoints: 15, suggestedCategory: "Errands" },
  { name: "Pick up a prescription", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Drop off dry cleaning", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Pick up dry cleaning", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Return Amazon package", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Drop off donations", defaultPoints: 15, suggestedCategory: "Errands" },
  { name: "Go to the hardware store", defaultPoints: 15, suggestedCategory: "Errands" },
  { name: "Fill up the gas tank", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Pick up takeout", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Return library books", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Take out the recycling bins", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Bring in the trash bins", defaultPoints: 5, suggestedCategory: "Home" },

  // Bills / admin (5–30 pts)
  { name: "Pay electric bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay water bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay gas bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay rent", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay mortgage", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay credit card bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay internet bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "File the bills", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Review the budget", defaultPoints: 15, suggestedCategory: "Bills" },
  { name: "Do the taxes", defaultPoints: 30, suggestedCategory: "Bills" },

  // Health (5–30 pts)
  { name: "Take vitamins", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Go for a walk", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Go to the gym", defaultPoints: 15, suggestedCategory: "Health" },
  { name: "Stretch", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Meal prep", defaultPoints: 30, suggestedCategory: "Health" },
  { name: "Schedule a dentist appointment", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Schedule a doctor appointment", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Pick up prescription refill", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Refill pet meds", defaultPoints: 5, suggestedCategory: "Health" },

  // Pets
  { name: "Walk the dog", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Bathe the dog", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Brush the dog", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Trim the cat's nails", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Refill pet food", defaultPoints: 5, suggestedCategory: "Errands" },

  // Meals & cooking
  { name: "Cook dinner", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Cook lunch", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Make breakfast", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Pack lunches", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Do the grocery list", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Wash the dishes by hand", defaultPoints: 15, suggestedCategory: "Home" },

  // Social / home admin
  { name: "Call mom", defaultPoints: 5, suggestedCategory: "Uncategorized" },
  { name: "Call dad", defaultPoints: 5, suggestedCategory: "Uncategorized" },
  { name: "Send a birthday card", defaultPoints: 5, suggestedCategory: "Uncategorized" },
  { name: "Buy a gift", defaultPoints: 15, suggestedCategory: "Errands" },
  { name: "Schedule date night", defaultPoints: 5, suggestedCategory: "Uncategorized" },
  { name: "Plan a trip", defaultPoints: 30, suggestedCategory: "Uncategorized" },
  { name: "Book a reservation", defaultPoints: 5, suggestedCategory: "Uncategorized" },
];
