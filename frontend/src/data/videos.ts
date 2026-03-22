export interface Video {
  id: string;
  url: string;
  creatorId: string;
  isPremium?: boolean;   // only visible to subscribers of that creator
  isPrivate?: boolean;  // community-only video
  tips: number;
  likes: number;
  isLiked?: boolean;
  description: string;
  // For user-posted videos (not in the hardcoded creators list)
  dynamicCreator?: {
    name: string;
    username: string;
    avatar: string;
    telegramUserId: string;
    walletAddress: string;
  };
}

export const videos: Video[] = [
  // ── Public videos ───────────────────────────────────────────────────────────
  {
    id: '1',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    creatorId: 'alexrivers',
    tips: 142,
    likes: 4821,
    description: 'Epic nature vibes 🌿 Living the dream on the blockchain! #TON #crypto',
  },
  {
    id: '2',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    creatorId: 'mayachen',
    tips: 89,
    likes: 3102,
    description: 'Dreams are built one block at a time ✨ #web3 #TelegramMiniApp',
  },
  {
    id: '3',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    creatorId: 'samvolkov',
    tips: 312,
    likes: 9450,
    description: 'Fire content every day 🔥 Tip me in TON if you vibe with this!',
  },
  {
    id: '4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    creatorId: 'lunapark',
    tips: 57,
    likes: 2233,
    description: 'Escape the ordinary 🚀 Powered by TON & Telegram',
  },
  {
    id: '5',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    creatorId: 'jakestorm',
    tips: 201,
    likes: 6780,
    description: 'Having the most fun on web3 😄 #TokGram #TONchain',
  },
  {
    id: '6',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    creatorId: 'arianova',
    tips: 178,
    likes: 5540,
    description: 'Joy is the ultimate currency 💫 Tip if this made you smile!',
  },
  {
    id: '7',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    creatorId: 'samvolkov',
    tips: 134,
    likes: 4120,
    description: "Off-road vibes on the TON chain ⚡ Let's go!",
  },
  {
    id: '8',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    creatorId: 'lunapark',
    tips: 44,
    likes: 1890,
    description: 'When the algorithm finds you 🌀 #vibes',
  },

  // ── Premium / VIP-only videos ────────────────────────────────────────────────
  {
    id: 'p1',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    creatorId: 'alexrivers',
    isPremium: true,
    tips: 320,
    likes: 8100,
    description: '🔒 Coulisses exclusives — le vrai processus créatif, sans filtre.',
  },
  {
    id: 'p2',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    creatorId: 'alexrivers',
    isPremium: true,
    tips: 210,
    likes: 5600,
    description: '🔒 Session live privée — merci à tous les membres VIP 🙏',
  },
  {
    id: 'p3',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    creatorId: 'jakestorm',
    isPremium: true,
    tips: 450,
    likes: 11200,
    description: '🔒 Giveaway exclusif 500 TON — réservé Storm Crew ⚡',
  },
  {
    id: 'p4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    creatorId: 'jakestorm',
    isPremium: true,
    tips: 388,
    likes: 9300,
    description: '🔒 Coaching crypto privé — stratégie bullrun 2025 📈',
  },
  {
    id: 'p5',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    creatorId: 'mayachen',
    isPremium: true,
    tips: 175,
    likes: 4400,
    description: '🔒 Tutoriel NFT exclusif — drop en avant-première 🎨',
  },
];

export function getVideosByCreator(creatorId: string): Video[] {
  return videos.filter((v) => v.creatorId === creatorId);
}

export function getPublicVideos(): Video[] {
  return videos.filter((v) => !v.isPremium);
}

export function getPremiumVideosForCreators(creatorIds: string[]): Video[] {
  return videos.filter((v) => v.isPremium && creatorIds.includes(v.creatorId));
}
