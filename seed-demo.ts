/**
 * Seed Demo Database Script
 *
 * Populates the database with 5 days of realistic wellness check-in history,
 * a pre-computed weekly pattern, and active wellness nudges for 'demo-user-001'.
 * This ensures that:
 * 1. The advanced dashboard charts display trend lines immediately.
 * 2. Completing one more check-in in the UI triggers the pattern and nudge agents.
 * 3. The video presentation shows a fully functional, data-rich application.
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "demo-user-001";

  console.log("🌱 Starting demo database seed...");

  // 1. Clean up existing records for the demo user to avoid key constraints
  console.log("🧹 Cleaning up old demo records...");
  await prisma.nudge.deleteMany({ where: { userId } });
  await prisma.pattern.deleteMany({ where: { userId } });
  await prisma.checkIn.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  // 2. Provision the user
  console.log("👤 Creating demo user...");
  await prisma.user.create({
    data: {
      id: userId,
      email: "demo-user-001@example.com",
      name: "Demo User",
    },
  });

  // 3. Seed 5 historical check-ins (spanning the last 5 days)
  console.log("📅 Seeding check-ins with realistic variation...");
  const baseDate = new Date();
  
  const checkInsData = [
    {
      daysAgo: 5,
      moodScore: 5,
      energy: 4,
      sleep: 5.5,
      summary: "Felt very sluggish today. Only slept 5.5 hours. High anxiety about the upcoming team presentation.",
      worries: "Work project presentation deadline",
      tags: ["work", "sleep"],
      rawText: "User: I am feeling pretty exhausted. Only slept about 5 and a half hours last night. Extremely anxious about a work presentation coming up in a few days. Mood is a 5, energy is a 4.\nCompanion: I hear you. Sleep deprivation coupled with presentation anxiety is really tough. Let's try to focus on resting today. [CHECK-IN COMPLETE]",
    },
    {
      daysAgo: 4,
      moodScore: 6,
      energy: 5,
      sleep: 6.0,
      summary: "Slightly better sleep, prep is going fine but presentation anxiety is still lingering in the background.",
      worries: "Presentation prep",
      tags: ["work", "health"],
      rawText: "User: I slept slightly better, around 6 hours. Prep for the presentation is going fine but still feeling anxious about it. Mood: 6, energy: 5.\nCompanion: Good to hear you got a bit more sleep. It's natural to have that anxiety in the background. Keep taking small steps. [CHECK-IN COMPLETE]",
    },
    {
      daysAgo: 3,
      moodScore: 4,
      energy: 3,
      sleep: 5.0,
      summary: "Terrible sleep. Anxiety peaked, had difficulty falling asleep. Stressed about manager feedback.",
      worries: "Manager presentation review",
      tags: ["work", "sleep"],
      rawText: "User: Had a bad night. Slept under 5 hours. Had a dry-run review and got some critical feedback from my manager. Feeling discouraged and tired. Mood: 4, energy: 3.\nCompanion: Critical feedback on top of exhaustion is incredibly hard. I'm sorry. Remember that feedback is a tool, not a measure of your worth. Let's practice a grounding technique. [CHECK-IN COMPLETE]",
    },
    {
      daysAgo: 2,
      moodScore: 7,
      energy: 6,
      sleep: 7.0,
      summary: "Felt much better. Went for a jog after work to blow off steam, which helped clear my head and improved sleep.",
      worries: null,
      tags: ["exercise", "health"],
      rawText: "User: Feeling much better today. Actually got 7 hours of sleep. I went for a 20-minute jog after work to blow off steam, which helped clear my mind. Mood: 7, energy: 6.\nCompanion: That's fantastic! Physical exercise is a powerful outlet for presentation stress. I'm glad it helped you sleep better too. [CHECK-IN COMPLETE]",
    },
    {
      daysAgo: 1,
      moodScore: 9,
      energy: 8,
      sleep: 7.5,
      summary: "Presentation went amazingly well! Big weight off my shoulders. Celebrated with friends after work.",
      worries: null,
      tags: ["work", "social"],
      rawText: "User: The presentation went amazingly! Everyone loved it. Feel so relieved. Slept 7.5 hours and went out to dinner with the team to celebrate. Mood: 9, energy: 8.\nCompanion: Wow, congratulations! You worked so hard and earned that success. Enjoy this relief and celebration—you've earned it! [CHECK-IN COMPLETE]",
    },
  ];

  for (const item of checkInsData) {
    const checkInDate = new Date(baseDate);
    checkInDate.setDate(baseDate.getDate() - item.daysAgo);
    
    await prisma.checkIn.create({
      data: {
        userId,
        moodScore: item.moodScore,
        energy: item.energy,
        sleep: item.sleep,
        summary: item.summary,
        worries: item.worries,
        rawText: item.rawText,
        tags: item.tags,
        createdAt: checkInDate,
      },
    });
  }

  // 4. Seed a weekly pattern analysis
  console.log("🧠 Creating weekly pattern analysis...");
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() - baseDate.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const pattern = await prisma.pattern.create({
    data: {
      userId,
      weekStart,
      moodTrend: "improving",
      summary: "Your week showed a classic stress-cycle pattern. High work presentation anxiety initially degraded sleep and mood. However, taking active control via exercise (jogging) and social connection (team dinner) broke the cycle, restoring mood and energy to peak levels.",
      insights: {
        triggers: ["Presentation deadlines", "Sleep under 6 hours", "Critical review feedback"],
        boosters: ["Aerobic exercise (jogging)", "Social celebrations", "Completing core tasks"],
        correlations: [
          "Sleep below 6 hours is strongly correlated with mood scores of 5 or lower.",
          "Cardio exercise acts as a fast-acting anxiety buffer, raising energy by +2 levels.",
        ],
        highlights: ["Presentation was highly successful", "Successfully rebounded mood from 4 to 9 in two days"],
      },
      entryCount: 5,
    },
  });

  // 5. Seed some initial personalized nudges
  console.log("💡 Generating active habit nudges...");
  const nudges = [
    {
      message: "Since jogging on Wednesday boosted your energy by +2, schedule a quick 20-minute outdoor jog or walk today to maintain momentum.",
      category: "exercise",
    },
    {
      message: "Your sleep data shows optimal mood (9/10) follows 7.5+ hours of sleep. Keep a consistent bedtime routine tonight to sustain this peak.",
      category: "sleep",
    },
  ];

  for (const nudge of nudges) {
    await prisma.nudge.create({
      data: {
        userId,
        message: nudge.message,
        category: nudge.category,
        patternId: pattern.id,
      },
    });
  }

  console.log("🎉 Database seeded successfully with 5 check-ins!");
  console.log(`👤 User ID: ${userId}`);
  console.log("📊 Trends and Weekly Insights are now fully populated!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
