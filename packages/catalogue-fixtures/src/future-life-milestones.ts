export const lifeMilestoneCategoryIds = [
  "learning",
  "work-and-craft",
  "home-and-independence",
  "relationships-and-community",
  "health-and-wellbeing",
  "creativity",
  "travel-and-adventure",
  "service-and-stewardship",
] as const;

export type LifeMilestoneCategoryId = (typeof lifeMilestoneCategoryIds)[number];

export interface FutureLifeMilestoneCategory {
  readonly categoryId: LifeMilestoneCategoryId;
  readonly label: string;
  readonly framing: string;
}

export interface FutureLifeMilestoneTemplate {
  readonly templateId: string;
  readonly categoryId: LifeMilestoneCategoryId;
  readonly label: string;
  readonly reflectionPrompt: string;
}

export const lifeMilestoneCategories = [
  {
    categoryId: "learning",
    label: "Learning",
    framing: "Skills, study, curiosity, and changes in understanding chosen by the person.",
  },
  {
    categoryId: "work-and-craft",
    label: "Work and craft",
    framing: "Meaningful work, practical craft, and healthy changes in how work is approached.",
  },
  {
    categoryId: "home-and-independence",
    label: "Home and independence",
    framing: "Ways of building a workable home life without treating ownership as the goal.",
  },
  {
    categoryId: "relationships-and-community",
    label: "Relationships and community",
    framing: "Connection, care, repair, belonging, help, and boundaries in many kinds of relationships.",
  },
  {
    categoryId: "health-and-wellbeing",
    label: "Health and wellbeing",
    framing: "Self-defined practices and recoveries, never medical claims or externally verified outcomes.",
  },
  {
    categoryId: "creativity",
    label: "Creativity",
    framing: "Making, practicing, performing, sharing, and returning to creative work.",
  },
  {
    categoryId: "travel-and-adventure",
    label: "Travel and adventure",
    framing: "Exploration at any distance, including nearby and accessible experiences.",
  },
  {
    categoryId: "service-and-stewardship",
    label: "Service and stewardship",
    framing: "Voluntary care for people, communities, causes, and places without ranking its scale.",
  },
] as const satisfies readonly FutureLifeMilestoneCategory[];

export const lifeMilestoneTemplates = [
  {
    templateId: "completed-a-course",
    categoryId: "learning",
    label: "Completed a course",
    reflectionPrompt: "What did you learn, and what stayed with you after finishing?",
  },
  {
    templateId: "reached-a-new-language-level",
    categoryId: "learning",
    label: "Reached a new language level",
    reflectionPrompt: "What became possible that was not possible before?",
  },
  {
    templateId: "taught-yourself-a-skill",
    categoryId: "learning",
    label: "Taught yourself a skill",
    reflectionPrompt: "How did you practice, and when did the skill begin to feel real?",
  },
  {
    templateId: "earned-a-credential",
    categoryId: "learning",
    label: "Earned a credential",
    reflectionPrompt: "What work did the credential represent for you?",
  },
  {
    templateId: "returned-to-learning",
    categoryId: "learning",
    label: "Returned to learning",
    reflectionPrompt: "What drew you back, and what was different this time?",
  },
  {
    templateId: "completed-a-research-project",
    categoryId: "learning",
    label: "Completed a research project",
    reflectionPrompt: "What question did you follow, and what did you discover?",
  },
  {
    templateId: "shared-what-you-learned",
    categoryId: "learning",
    label: "Shared what you learned",
    reflectionPrompt: "Who did you share it with, and how did teaching deepen your understanding?",
  },
  {
    templateId: "changed-your-mind-through-learning",
    categoryId: "learning",
    label: "Changed your mind through learning",
    reflectionPrompt: "What evidence or experience changed your perspective?",
  },
  {
    templateId: "started-a-new-role",
    categoryId: "work-and-craft",
    label: "Started a new role",
    reflectionPrompt: "What did the transition ask of you?",
  },
  {
    templateId: "completed-a-major-project",
    categoryId: "work-and-craft",
    label: "Completed a major project",
    reflectionPrompt: "What made the work substantial, and what are you proud of?",
  },
  {
    templateId: "changed-career-direction",
    categoryId: "work-and-craft",
    label: "Changed career direction",
    reflectionPrompt: "What led you toward the new direction?",
  },
  {
    templateId: "built-a-portfolio-piece",
    categoryId: "work-and-craft",
    label: "Built a portfolio piece",
    reflectionPrompt: "What does this piece show about your craft now?",
  },
  {
    templateId: "learned-a-hands-on-craft",
    categoryId: "work-and-craft",
    label: "Learned a hands-on craft",
    reflectionPrompt: "Which tools, materials, or motions became familiar?",
  },
  {
    templateId: "repaired-or-restored-something",
    categoryId: "work-and-craft",
    label: "Repaired or restored something",
    reflectionPrompt: "What did you bring back into useful life?",
  },
  {
    templateId: "supported-a-colleague",
    categoryId: "work-and-craft",
    label: "Supported a colleague",
    reflectionPrompt: "What kind of support mattered in that moment?",
  },
  {
    templateId: "set-a-healthier-work-boundary",
    categoryId: "work-and-craft",
    label: "Set a healthier work boundary",
    reflectionPrompt: "What did you protect or make room for?",
  },
  {
    templateId: "moved-to-a-new-home",
    categoryId: "home-and-independence",
    label: "Moved to a new home",
    reflectionPrompt: "What marked the beginning of this chapter?",
  },
  {
    templateId: "made-a-place-feel-like-home",
    categoryId: "home-and-independence",
    label: "Made a place feel like home",
    reflectionPrompt: "Which details made the space feel like yours?",
  },
  {
    templateId: "lived-independently",
    categoryId: "home-and-independence",
    label: "Lived independently",
    reflectionPrompt: "What did you learn about supporting your own daily life?",
  },
  {
    templateId: "navigated-a-major-move",
    categoryId: "home-and-independence",
    label: "Navigated a major move",
    reflectionPrompt: "What helped you adapt to the change?",
  },
  {
    templateId: "learned-a-home-maintenance-skill",
    categoryId: "home-and-independence",
    label: "Learned a home-maintenance skill",
    reflectionPrompt: "What can you now care for or fix yourself?",
  },
  {
    templateId: "cooked-a-signature-meal",
    categoryId: "home-and-independence",
    label: "Cooked a signature meal",
    reflectionPrompt: "Why does this meal feel like one of yours?",
  },
  {
    templateId: "created-a-supportive-home-routine",
    categoryId: "home-and-independence",
    label: "Created a supportive home routine",
    reflectionPrompt: "How did the routine make everyday life work better?",
  },
  {
    templateId: "chose-a-living-arrangement-that-fit",
    categoryId: "home-and-independence",
    label: "Chose a living arrangement that fit",
    reflectionPrompt: "What made this arrangement right for this part of your life?",
  },
  {
    templateId: "made-a-new-friend",
    categoryId: "relationships-and-community",
    label: "Made a new friend",
    reflectionPrompt: "What helped the connection begin?",
  },
  {
    templateId: "deepened-an-important-friendship",
    categoryId: "relationships-and-community",
    label: "Deepened an important friendship",
    reflectionPrompt: "Which shared moment made the friendship feel deeper?",
  },
  {
    templateId: "repaired-a-relationship",
    categoryId: "relationships-and-community",
    label: "Repaired a relationship",
    reflectionPrompt: "What honest action made repair possible?",
  },
  {
    templateId: "celebrated-someone-you-care-about",
    categoryId: "relationships-and-community",
    label: "Celebrated someone you care about",
    reflectionPrompt: "What did you want them to feel remembered for?",
  },
  {
    templateId: "hosted-a-gathering",
    categoryId: "relationships-and-community",
    label: "Hosted a gathering",
    reflectionPrompt: "What made the gathering feel welcoming?",
  },
  {
    templateId: "joined-a-community",
    categoryId: "relationships-and-community",
    label: "Joined a community",
    reflectionPrompt: "What gave you a sense of belonging?",
  },
  {
    templateId: "asked-someone-for-help",
    categoryId: "relationships-and-community",
    label: "Asked someone for help",
    reflectionPrompt: "What made asking possible, and what support arrived?",
  },
  {
    templateId: "set-a-healthy-relationship-boundary",
    categoryId: "relationships-and-community",
    label: "Set a healthy relationship boundary",
    reflectionPrompt: "What did the boundary protect or clarify?",
  },
  {
    templateId: "built-a-movement-habit",
    categoryId: "health-and-wellbeing",
    label: "Built a movement habit",
    reflectionPrompt: "What kind of movement became sustainable for you?",
  },
  {
    templateId: "learned-to-swim",
    categoryId: "health-and-wellbeing",
    label: "Learned to swim",
    reflectionPrompt: "Which moment made you feel more capable in the water?",
  },
  {
    templateId: "completed-a-personal-endurance-goal",
    categoryId: "health-and-wellbeing",
    label: "Completed a personal endurance goal",
    reflectionPrompt: "How did you define the goal, and what carried you through it?",
  },
  {
    templateId: "established-a-rest-routine",
    categoryId: "health-and-wellbeing",
    label: "Established a rest routine",
    reflectionPrompt: "What helped rest become a practice instead of an afterthought?",
  },
  {
    templateId: "cooked-meals-that-supported-you",
    categoryId: "health-and-wellbeing",
    label: "Cooked meals that supported you",
    reflectionPrompt: "What made this way of feeding yourself workable?",
  },
  {
    templateId: "asked-for-professional-support",
    categoryId: "health-and-wellbeing",
    label: "Asked for professional support",
    reflectionPrompt: "What helped you take that step?",
  },
  {
    templateId: "returned-after-a-setback",
    categoryId: "health-and-wellbeing",
    label: "Returned after a setback",
    reflectionPrompt: "What made beginning again possible?",
  },
  {
    templateId: "found-a-wellbeing-practice-that-fit",
    categoryId: "health-and-wellbeing",
    label: "Found a wellbeing practice that fit",
    reflectionPrompt: "Why did this practice fit your life better than other approaches?",
  },
  {
    templateId: "finished-a-creative-project",
    categoryId: "creativity",
    label: "Finished a creative project",
    reflectionPrompt: "What did finishing teach you about the work?",
  },
  {
    templateId: "shared-your-creative-work",
    categoryId: "creativity",
    label: "Shared your creative work",
    reflectionPrompt: "What did it feel like to let someone else encounter it?",
  },
  {
    templateId: "performed-for-an-audience",
    categoryId: "creativity",
    label: "Performed for an audience",
    reflectionPrompt: "Which moment from the performance do you remember most?",
  },
  {
    templateId: "learned-a-new-creative-medium",
    categoryId: "creativity",
    label: "Learned a new creative medium",
    reflectionPrompt: "What did the medium let you express differently?",
  },
  {
    templateId: "sustained-a-creative-practice",
    categoryId: "creativity",
    label: "Sustained a creative practice",
    reflectionPrompt: "What rhythm helped you keep returning to the work?",
  },
  {
    templateId: "completed-a-long-form-piece",
    categoryId: "creativity",
    label: "Completed a long-form piece",
    reflectionPrompt: "How did the piece change between its beginning and end?",
  },
  {
    templateId: "made-a-handmade-gift",
    categoryId: "creativity",
    label: "Made a handmade gift",
    reflectionPrompt: "What did you hope the gift would communicate?",
  },
  {
    templateId: "returned-to-an-abandoned-project",
    categoryId: "creativity",
    label: "Returned to an abandoned project",
    reflectionPrompt: "What made the project worth returning to now?",
  },
  {
    templateId: "took-a-solo-trip",
    categoryId: "travel-and-adventure",
    label: "Took a solo trip",
    reflectionPrompt: "What did traveling on your own reveal?",
  },
  {
    templateId: "visited-a-new-country",
    categoryId: "travel-and-adventure",
    label: "Visited a new country",
    reflectionPrompt: "Which encounter made the place vivid for you?",
  },
  {
    templateId: "explored-somewhere-close-to-home",
    categoryId: "travel-and-adventure",
    label: "Explored somewhere close to home",
    reflectionPrompt: "What did you notice because you approached a nearby place with curiosity?",
  },
  {
    templateId: "completed-a-long-hike",
    categoryId: "travel-and-adventure",
    label: "Completed a long hike",
    reflectionPrompt: "Which part of the route stays with you?",
  },
  {
    templateId: "camped-overnight",
    categoryId: "travel-and-adventure",
    label: "Camped overnight",
    reflectionPrompt: "What do you remember about the place after dark?",
  },
  {
    templateId: "navigated-an-unfamiliar-place",
    categoryId: "travel-and-adventure",
    label: "Navigated an unfamiliar place",
    reflectionPrompt: "What helped you find your way?",
  },
  {
    templateId: "tried-a-new-outdoor-activity",
    categoryId: "travel-and-adventure",
    label: "Tried a new outdoor activity",
    reflectionPrompt: "What made trying it memorable?",
  },
  {
    templateId: "returned-to-a-meaningful-place",
    categoryId: "travel-and-adventure",
    label: "Returned to a meaningful place",
    reflectionPrompt: "What had changed in the place, and what had changed in you?",
  },
  {
    templateId: "volunteered-for-a-cause",
    categoryId: "service-and-stewardship",
    label: "Volunteered for a cause",
    reflectionPrompt: "What contribution felt useful?",
  },
  {
    templateId: "mentored-someone",
    categoryId: "service-and-stewardship",
    label: "Mentored someone",
    reflectionPrompt: "What knowledge or encouragement were you able to share?",
  },
  {
    templateId: "organized-a-community-effort",
    categoryId: "service-and-stewardship",
    label: "Organized a community effort",
    reflectionPrompt: "How did people come together around the work?",
  },
  {
    templateId: "cared-for-a-natural-place",
    categoryId: "service-and-stewardship",
    label: "Cared for a natural place",
    reflectionPrompt: "What place did you help tend or restore?",
  },
  {
    templateId: "helped-a-neighbor",
    categoryId: "service-and-stewardship",
    label: "Helped a neighbor",
    reflectionPrompt: "What kind of help mattered in the moment?",
  },
  {
    templateId: "served-in-a-civic-role",
    categoryId: "service-and-stewardship",
    label: "Served in a civic role",
    reflectionPrompt: "What responsibility did you take on for your community?",
  },
  {
    templateId: "sustained-a-giving-practice",
    categoryId: "service-and-stewardship",
    label: "Sustained a giving practice",
    reflectionPrompt: "What made the practice meaningful and sustainable for you?",
  },
  {
    templateId: "advocated-for-someone",
    categoryId: "service-and-stewardship",
    label: "Advocated for someone",
    reflectionPrompt: "What did you help make heard or understood?",
  },
] as const satisfies readonly FutureLifeMilestoneTemplate[];
