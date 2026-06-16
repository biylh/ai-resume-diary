import fs from 'fs';
import path from 'path';

const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'db.json')
  : path.join(process.cwd(), 'db.json');

// Initialize database file if it doesn't exist
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: {
        "mock-user-id": {
          id: "mock-user-id",
          email: "guest@example.com",
          display_name: "体验用户",
          industry: "互联网IT",
          current_role: "产品助理",
          target_role: "产品经理",
          created_at: new Date().toISOString()
        }
      },
      diaries: [
        {
          id: "mock-diary-1",
          user_id: "mock-user-id",
          raw_input: "今天去冷轧车间跟进冰箱侧板冲压工艺，发现了一个定位偏差，协同车间技术员进行了校准。",
          refined_bullet: "参与冰箱供应链轮岗，跟进冷藏室门板冲压工序。针对试制中板材良率偏低问题，主动排查定位销磨损瓶颈，协同车间技术员提出改用耐磨合金定位销的改进方案，使板材成型良率由 92% 提升至 98%，有效保障了新产品试制节点。",
          chat_history: [
            { role: "user", content: "今天去冷轧车间跟进冰箱侧板冲压工艺，发现了一个定位偏差，协同车间技术员进行了校准。" },
            { role: "model", content: "你今天主动去车间跟进冰箱侧板冲压工艺非常棒，能注意到定位偏差是优秀产品经理的特质。你提到协同了车间工艺员，那你们具体是怎么调整定位销的？调整后冲压的良率有提升吗？\n\n[STAR_RESUME]\n参与冰箱供应链轮岗，跟进冷藏室门板冲压工序。针对试制中板材良率偏低问题，主动排查定位销磨损瓶颈，协同车间技术员提出改用耐磨合金定位销的改进方案，使板材成型良率由 92% 提升至 98%，有效保障了新产品试制节点。\n[/STAR_RESUME]" }
          ],
          category: "日常工作",
          is_pinned: false,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading local database file:", error);
    return { users: {}, diaries: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Error writing to local database file:", error);
    return false;
  }
}

export const localDb = {
  // Authentication
  login: async (email, password) => {
    const db = readDb();
    // Simple mock authentication: accept guest@example.com or any email with password length >= 6
    const user = Object.values(db.users).find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      return { user, session: { access_token: `mock-token-${user.id}`, user } };
    }
    
    // Auto-create user for simple local trial
    if (password && password.length >= 6) {
      const newUserId = `user-${Math.random().toString(36).substr(2, 9)}`;
      const newUser = {
        id: newUserId,
        email: email,
        display_name: email.split('@')[0],
        industry: "通用行业",
        current_role: "职场人",
        target_role: "待定",
        created_at: new Date().toISOString()
      };
      db.users[newUserId] = newUser;
      writeDb(db);
      return { user: newUser, session: { access_token: `mock-token-${newUserId}`, user: newUser } };
    }
    
    throw new Error("Invalid password (must be at least 6 characters) or user not found.");
  },

  loginAsGuest: async () => {
    const db = readDb();
    const guestId = `guest-${Math.random().toString(36).substr(2, 9)}`;
    const guestUser = {
      id: guestId,
      email: "guest@example.com",
      display_name: "访客用户",
      industry: "通用行业",
      current_role: "职场人",
      target_role: "待定",
      is_guest: true,
      created_at: new Date().toISOString()
    };
    db.users[guestId] = guestUser;

    // Clone a template diary for this guest so timeline is not empty
    const templateDiary = {
      id: `diary-${Math.random().toString(36).substr(2, 9)}`,
      user_id: guestId,
      raw_input: "今天去冷轧车间跟进冰箱侧板冲压工艺，发现了一个定位偏差，协同车间技术员进行了校准。",
      refined_bullet: "参与冰箱供应链轮岗，跟进冷藏室门板冲压工序。针对试制中板材良率偏低问题，主动排查定位销磨损瓶颈，协同车间技术员提出改用耐磨合金定位销的改进方案，使板材成型良率由 92% 提升至 98%，有效保障了新产品试制节点。",
      chat_history: [
        { role: "user", content: "今天去冷轧车间跟进冰箱侧板冲压工艺，发现了一个定位偏差，协同车间技术员进行了校准。" },
        { role: "model", content: "你今天主动去车间跟进冰箱侧板冲压工艺非常棒，能注意到定位偏差是优秀产品经理的特质。你提到协同了车间工艺员，那你们具体是怎么调整定位销的？调整后冲压的良率有提升吗？\n\n[STAR_RESUME]\n参与冰箱供应链轮岗，跟进冷藏室门板冲压工序。针对试制中板材良率偏低问题，主动排查定位销磨损瓶颈，协同车间技术员提出改用耐磨合金定位销的改进方案，使板材成型良率由 92% 提升至 98%，有效保障了新产品试制节点。\n[/STAR_RESUME]" }
      ],
      category: "日常工作",
      is_pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.diaries.push(templateDiary);

    writeDb(db);
    return { user: guestUser, session: { access_token: `mock-token-${guestId}`, user: guestUser } };
  },

  signup: async (email, password, displayName, industry, currentRole, targetRole) => {
    const db = readDb();
    const existingUser = Object.values(db.users).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      throw new Error("Email already registered in local database.");
    }

    const newUserId = `user-${Math.random().toString(36).substr(2, 9)}`;
    const newUser = {
      id: newUserId,
      email,
      display_name: displayName || email.split('@')[0],
      industry: industry || "通用行业",
      current_role: currentRole || "职场人",
      target_role: targetRole || "待定",
      created_at: new Date().toISOString()
    };

    db.users[newUserId] = newUser;
    writeDb(db);
    return { user: newUser, session: { access_token: `mock-token-${newUserId}`, user: newUser } };
  },

  getUserProfile: async (userId) => {
    const db = readDb();
    let user = db.users[userId];
    if (!user) {
      // Self-healing: auto-recreate profile if missing due to serverless container migration/cold-starts
      user = {
        id: userId,
        email: "guest@example.com",
        display_name: "体验用户",
        industry: "通用行业",
        current_role: "职场人",
        target_role: "待定",
        created_at: new Date().toISOString()
      };
      db.users[userId] = user;
      writeDb(db);
    }
    return user;
  },

  updateUserProfile: async (userId, profileUpdates) => {
    const db = readDb();
    if (!db.users[userId]) {
      db.users[userId] = { id: userId, created_at: new Date().toISOString() };
    }
    db.users[userId] = {
      ...db.users[userId],
      ...profileUpdates,
      updated_at: new Date().toISOString()
    };
    writeDb(db);
    return db.users[userId];
  },

  // Diaries CRUD
  getDiaries: async (userId) => {
    const db = readDb();
    return db.diaries
      .filter(d => d.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  addDiary: async (userId, rawInput, refinedBullet, chatHistory, category) => {
    const db = readDb();
    const newDiary = {
      id: `diary-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      raw_input: rawInput,
      refined_bullet: refinedBullet,
      chat_history: chatHistory || [],
      category: category || "日常工作",
      is_pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.diaries.push(newDiary);
    writeDb(db);
    return newDiary;
  },

  updateDiary: async (userId, diaryId, updates) => {
    const db = readDb();
    const idx = db.diaries.findIndex(d => d.id === diaryId && d.user_id === userId);
    if (idx === -1) throw new Error("Diary not found or permission denied.");
    
    db.diaries[idx] = {
      ...db.diaries[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    writeDb(db);
    return db.diaries[idx];
  },

  deleteDiary: async (userId, diaryId) => {
    const db = readDb();
    const initialLen = db.diaries.length;
    db.diaries = db.diaries.filter(d => !(d.id === diaryId && d.user_id === userId));
    if (db.diaries.length === initialLen) throw new Error("Diary not found or permission denied.");
    writeDb(db);
    return { success: true };
  }
};
