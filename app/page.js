"use strict";

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { 
  MessageSquare, 
  Calendar, 
  FileText, 
  Settings, 
  Send, 
  Trash2, 
  Star, 
  Copy, 
  LogOut, 
  Edit, 
  Save, 
  Sparkles, 
  Search, 
  ChevronRight,
  Database,
  ArrowRight,
  Check
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  
  // Navigation State
  const [activePane, setActivePane] = useState("chat-pane"); // chat-pane, timeline-pane, generator-pane, settings-pane
  
  // User Session State
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(true);
  
  // Custom API Key (stored in localStorage)
  const [customApiKey, setCustomApiKey] = useState("");
  
  // Diary Data State
  const [diaries, setDiaries] = useState([]);
  const [loadingDiaries, setLoadingDiaries] = useState(false);
  
  // Today's Chat State
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRefinedBullet, setCurrentRefinedBullet] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("日常工作");
  const [welcomeGenerated, setWelcomeGenerated] = useState(false);
  
  // Timeline filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [timelineCategory, setTimelineCategory] = useState("全部");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  // Edit diary state
  const [editingDiaryId, setEditingDiaryId] = useState(null);
  const [editingText, setEditingText] = useState("");
  
  // Resume Generator selection
  const [selectedDiaryIds, setSelectedDiaryIds] = useState([]);
  
  // Action notifications
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  
  // Chat scroll anchor
  const messagesEndRef = useRef(null);

  // Fetch session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        setIsLocalMode(!data.supabaseConfigured);
        if (!data.authenticated) {
          router.push("/login");
        } else {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        router.push("/login");
      } finally {
        setLoadingSession(false);
      }
    }
    checkSession();
    
    // Load custom API key if it exists
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("user_gemini_api_key") || "";
      setCustomApiKey(savedKey);
    }
  }, [router]);

  // Fetch Diaries once user is logged in
  useEffect(() => {
    if (user) {
      fetchDiaries();
    }
  }, [user]);

  // Scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // Dynamic initial greeting when user details are ready
  useEffect(() => {
    if (user && chatHistory.length === 0 && !welcomeGenerated) {
      setWelcomeGenerated(true);
      setChatHistory([
        {
          role: "model",
          content: `你好，${user.display_name}！我是你的专属 AI 简历导师。\n\n目前你的画像配置如下：\n- **当前行业**：${user.industry}\n- **当前岗位**：${user.current_role}\n- **目标岗位**：${user.target_role}\n\n请告诉我你今天完成了什么工作（例如一句话日报，或者写下你的几点工作总结），我将协助你通过 **STAR 原则** 提炼出符合目标岗位要求的黄金简历话术！`
        }
      ]);
    }
  }, [user, chatHistory, welcomeGenerated]);

  const fetchDiaries = async () => {
    setLoadingDiaries(true);
    try {
      const res = await fetch("/api/diaries");
      const data = await res.json();
      if (res.ok) {
        setDiaries(data.diaries || []);
        // Automatically select all by default for resume synthesizer
        setSelectedDiaryIds((data.diaries || []).map(d => d.id));
      }
    } catch (err) {
      console.error("Failed to fetch diaries:", err);
    } finally {
      setLoadingDiaries(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const saveCustomApiKey = (key) => {
    setCustomApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("user_gemini_api_key", key);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2000);
    }
  };

  // Helper to extract STAR_RESUME content from model response
  const extractStarResume = (text) => {
    const startTag = "[STAR_RESUME]";
    const endTag = "[/STAR_RESUME]";
    const startIndex = text.indexOf(startTag);
    const endIndex = text.indexOf(endTag);

    if (startIndex !== -1 && endIndex !== -1) {
      return text.substring(startIndex + startTag.length, endIndex).trim();
    }
    return "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || isGenerating) return;

    const userMsg = chatMessage.trim();
    setChatMessage("");
    
    // Add user message to history
    const newHistory = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(newHistory);
    setIsGenerating(true);

    // Prepare history for API (remove UI-only prefixes or clean up format if needed)
    // To send to API, we filter out model messages and format correctly
    const apiHistory = newHistory.map(item => ({
      role: item.role,
      content: item.content
    }));

    const isGuest = user && (user.id.startsWith("guest-") || user.email === "guest@example.com" || !user.email);
    const hasCustomKey = customApiKey && customApiKey.trim() !== "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: apiHistory.slice(0, -1), // send previous history
          userProfile: {
            industry: user.industry,
            currentRole: user.current_role,
            targetRole: user.target_role
          },
          customApiKey: customApiKey || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.error === "LIMIT_REACHED") {
          setUser(prev => ({ ...prev, chat_count: 3 }));
        }
        throw new Error(errData.message || errData.error || "请求 AI 接口失败");
      }

      // Read stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let aiResponseText = "";

      // Append empty model message to start typing effect
      setChatHistory(prev => [...prev, { role: "model", content: "" }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          aiResponseText += chunk;
          
          // Update chat bubble
          setChatHistory(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "model", content: aiResponseText };
            return updated;
          });

          // Check if STAR_RESUME has started showing and update preview card in real-time
          const bullet = extractStarResume(aiResponseText);
          if (bullet) {
            setCurrentRefinedBullet(bullet);
          }
        }
      }

      // Update chat count locally for guest after successful stream completion
      if (isGuest && !hasCustomKey) {
        setUser(prev => ({
          ...prev,
          chat_count: (prev?.chat_count || 0) + 1
        }));
      }

    } catch (err) {
      console.error("Chat generation failed:", err);
      setChatHistory(prev => [
        ...prev,
        { role: "model", content: `❌ 发生错误: ${err.message}` }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save refined bullet to workspace
  const handleSaveDiary = async () => {
    if (!currentRefinedBullet) return;

    // Get the first user message as raw input for summary
    const firstUserMsg = chatHistory.find(h => h.role === "user")?.content || "今日日常记录";

    try {
      const res = await fetch("/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: firstUserMsg,
          refinedBullet: currentRefinedBullet,
          chatHistory: chatHistory,
          category: selectedCategory
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        fetchDiaries();
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        const data = await res.json();
        alert("保存失败: " + data.error);
      }
    } catch (err) {
      console.error("Save diary error:", err);
    }
  };

  // Toggle pin/favorite
  const handleTogglePin = async (diary) => {
    try {
      const res = await fetch(`/api/diaries/${diary.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !diary.is_pinned })
      });
      if (res.ok) {
        fetchDiaries();
      }
    } catch (err) {
      console.error("Toggle pin error:", err);
    }
  };

  // Delete diary entry
  const handleDeleteDiary = async (diaryId) => {
    if (!confirm("确定要删除这条记录吗？物理删除后不可恢复。")) return;
    try {
      const res = await fetch(`/api/diaries/${diaryId}`, { method: "DELETE" });
      if (res.ok) {
        fetchDiaries();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Edit refined text directly
  const handleStartEdit = (diary) => {
    setEditingDiaryId(diary.id);
    setEditingText(diary.refined_bullet);
  };

  const handleSaveEdit = async (diaryId) => {
    try {
      const res = await fetch(`/api/diaries/${diaryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refinedBullet: editingText })
      });
      if (res.ok) {
        setEditingDiaryId(null);
        fetchDiaries();
      }
    } catch (err) {
      console.error("Edit save error:", err);
    }
  };

  // Profile update submit
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaveSuccess(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: user.display_name,
          industry: user.industry,
          currentRole: user.current_role,
          targetRole: user.target_role
        })
      });
      if (res.ok) {
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 2000);
      } else {
        alert("更新失败");
      }
    } catch (err) {
      console.error("Update profile error:", err);
    }
  };

  // Reset current chat session
  const handleResetChat = () => {
    setChatHistory([
      {
        role: "model",
        content: `好的，会话已重置。我是你的专属 AI 简历导师。\n\n请写下你今天的工作或者日报，我们重新开始深度挖掘！`
      }
    ]);
    setCurrentRefinedBullet("");
  };

  // Clipboard copy utilities
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Timeline filtering logic
  const filteredDiaries = diaries.filter(diary => {
    const matchesSearch = 
      diary.raw_input.toLowerCase().includes(searchQuery.toLowerCase()) || 
      diary.refined_bullet.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = timelineCategory === "全部" || diary.category === timelineCategory;
    const matchesPin = !showPinnedOnly || diary.is_pinned;
    return matchesSearch && matchesCategory && matchesPin;
  });

  // Synthesize Markdown Resume Content
  const generateResumeMarkdown = () => {
    if (!user) return "";
    const selectedDiaries = diaries.filter(d => selectedDiaryIds.includes(d.id));
    
    let md = `# 个人简历素材库 - ${user.display_name}\n\n`;
    md += `* **意向行业**：${user.industry}\n`;
    md += `* **当前岗位**：${user.current_role}\n`;
    md += `* **目标岗位**：${user.target_role}\n\n`;
    md += `--- \n\n## 核心项目与工作经历 (STAR精选话术)\n\n`;
    
    if (selectedDiaries.length === 0) {
      md += `*（未选中任何简历素材。请在下方列表中勾选需要合成的记录）*`;
      return md;
    }

    // Group by category
    const categories = ["日常工作", "项目历练", "学习提升", "其它"];
    categories.forEach(cat => {
      const catItems = selectedDiaries.filter(d => d.category === cat);
      if (catItems.length > 0) {
        md += `### 【${cat}】\n\n`;
        catItems.forEach((item, index) => {
          md += `${index + 1}. **${new Date(item.created_at).toLocaleDateString("zh-CN")} 提炼**：\n   ${item.refined_bullet}\n\n`;
        });
      }
    });

    return md;
  };

  const handleSelectAllDiaries = () => {
    if (selectedDiaryIds.length === diaries.length) {
      setSelectedDiaryIds([]);
    } else {
      setSelectedDiaryIds(diaries.map(d => d.id));
    }
  };

  const handleToggleSelectDiary = (id) => {
    if (selectedDiaryIds.includes(id)) {
      setSelectedDiaryIds(selectedDiaryIds.filter(dId => dId !== id));
    } else {
      setSelectedDiaryIds([...selectedDiaryIds, id]);
    }
  };

  const isGuest = user && (user.id.startsWith("guest-") || user.email === "guest@example.com" || !user.email);
  const hasCustomKey = customApiKey && customApiKey.trim() !== "";
  
  const isLimitReached = isGuest && !hasCustomKey && (user?.chat_count || 0) >= 3;
  const isBindKeyRequired = user && !isGuest && !hasCustomKey;

  if (loadingSession) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>身份验证中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 1. SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="logo-section">
            <div className="logo-icon">
              <Sparkles size={18} />
            </div>
            <span className="logo-text">AI 简历日记</span>
          </div>

          <nav>
            <ul className="nav-menu">
              <li>
                <div 
                  className={`nav-item ${activePane === "chat-pane" ? "active" : ""}`}
                  onClick={() => setActivePane("chat-pane")}
                >
                  <MessageSquare size={16} />
                  <span>今日记录</span>
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activePane === "timeline-pane" ? "active" : ""}`}
                  onClick={() => setActivePane("timeline-pane")}
                >
                  <Calendar size={16} />
                  <span>工作台记忆</span>
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activePane === "generator-pane" ? "active" : ""}`}
                  onClick={() => setActivePane("generator-pane")}
                >
                  <FileText size={16} />
                  <span>简历合成</span>
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activePane === "settings-pane" ? "active" : ""}`}
                  onClick={() => setActivePane("settings-pane")}
                >
                  <Settings size={16} />
                  <span>个人配置</span>
                </div>
              </li>
            </ul>
          </nav>
        </div>

        {/* User profile section at the bottom */}
        {user && (
          <div className="user-profile">
            <div className="avatar">
              {user.display_name ? user.display_name.substring(0, 1) : "?"}
            </div>
            <div className="profile-info" style={{ flexGrow: 1 }}>
              <span className="profile-name">{user.display_name}</span>
              <span className="profile-title">{user.target_role}</span>
            </div>
            <button 
              onClick={handleLogout} 
              title="退出登录" 
              style={styles.logoutIconBtn}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="main-content">
        
        {/* A. 今日日记记录对话区 */}
        {activePane === "chat-pane" && (
          <div style={styles.paneContainer}>
            <div className="pane-header" style={styles.paneHeaderNoBorder}>
              <h1 className="pane-title">今日经历深挖</h1>
              <p className="pane-desc">输入一句话日报或今日经历，AI 导师会深入追问，提炼高质量 STAR 简历素材。</p>
            </div>

            <div style={styles.chatWorkspace}>
              {/* Left Column: Chat Dialogue */}
              <div style={styles.chatBox}>
                <div style={styles.chatMessages}>
                  {chatHistory.map((msg, index) => (
                    <div 
                      key={index} 
                      style={msg.role === "user" ? styles.userBubbleContainer : styles.modelBubbleContainer}
                    >
                      <div 
                        style={msg.role === "user" ? styles.userAvatarBubble : styles.modelAvatarBubble}
                      >
                        {msg.role === "user" ? "ME" : "AI"}
                      </div>
                      <div style={styles.messageContent}>
                        {msg.role === "user" ? (
                          <div style={styles.userMessageText}>{msg.content}</div>
                        ) : (
                          <div style={styles.modelMessageText}>
                            {/* Render everything except the STAR tag content in the bubble to keep it clean */}
                            <ReactMarkdown>
                              {msg.content.replace(/\[STAR_RESUME\][\s\S]*?\[\/STAR_RESUME\]/g, "").trim()}
                            </ReactMarkdown>
                            
                            {/* If there is a STAR segment in this message, show a small visual hint in the chat bubble */}
                            {extractStarResume(msg.content) && (
                              <div style={styles.chatRefinedHint}>
                                <Sparkles size={12} />
                                <span>已提炼出 STAR 简历话术，已同步到右侧预览卡片</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                {isLimitReached ? (
                  <div style={styles.limitBanner}>
                    <p style={styles.limitText}>⚠️ 您已达到访客模式使用内置 API 密钥的 3 次提问限制。</p>
                    <div style={styles.limitButtons}>
                      <button 
                        type="button" 
                        onClick={() => setActivePane("settings-pane")} 
                        style={styles.limitBtn}
                      >
                        去个人配置绑定您的 API 密钥
                      </button>
                      <button 
                        type="button" 
                        onClick={() => router.push("/login")} 
                        style={styles.limitBtnSecondary}
                      >
                        注册 / 登录正式账户
                      </button>
                    </div>
                  </div>
                ) : isBindKeyRequired ? (
                  <div style={styles.limitBanner}>
                    <p style={styles.limitText}>⚠️ 当前处于注册账户模式。为了保护服务额度，请先绑定您的 API 密钥以激活 AI 功能。</p>
                    <button 
                      type="button" 
                      onClick={() => setActivePane("settings-pane")} 
                      style={styles.limitBtn}
                    >
                      去个人配置绑定 API 密钥
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} style={styles.chatInputForm}>
                    <div style={styles.chatInputWrapper}>
                      <textarea
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="输入一句话日报，例如：今天完成了商用冰箱制冷芯片测试，解决了高低温漂移的问题..."
                        rows={1}
                        disabled={isGenerating}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        style={styles.chatTextarea}
                      />
                      <button 
                        type="submit" 
                        disabled={isGenerating || !chatMessage.trim()} 
                        style={chatMessage.trim() ? styles.btnSendActive : styles.btnSendDisabled}
                      >
                        <Send size={15} />
                      </button>
                    </div>
                    <div style={styles.chatToolbar}>
                      <button 
                        type="button" 
                        onClick={handleResetChat} 
                        style={styles.btnResetChat}
                      >
                        重置本次对话
                      </button>
                      <span style={styles.chatTip}>按 Enter 发送，Shift+Enter 换行</span>
                    </div>
                  </form>
                )}
              </div>

              {/* Right Column: Live STAR refinement preview */}
              <div style={styles.previewSidebar}>
                <div className="glass-panel" style={styles.previewCard}>
                  <div style={styles.previewCardHeader}>
                    <div style={styles.previewCardBadge}>
                      <Sparkles size={13} />
                      <span>STAR 实时简历提炼</span>
                    </div>
                    <select 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={styles.categoryDropdown}
                    >
                      <option value="日常工作">🏷️ 日常工作</option>
                      <option value="项目历练">🏷️ 项目历练</option>
                      <option value="学习提升">🏷️ 学习提升</option>
                      <option value="其它">🏷️ 其它</option>
                    </select>
                  </div>

                  <div style={styles.previewCardBody}>
                    {currentRefinedBullet ? (
                      <div style={styles.bulletBox}>
                        <div style={styles.bulletBoxTitle}>以产品人第一人称提炼话术：</div>
                        <p style={styles.bulletText}>{currentRefinedBullet}</p>
                      </div>
                    ) : (
                      <div style={styles.placeholderContainer}>
                        <div style={styles.placeholderIcon}>
                          <MessageSquare size={36} />
                        </div>
                        <p style={styles.placeholderText}>
                          在左侧输入今日日报并与 AI 开始对话，AI 将自动在此处输出经过 STAR 法则提炼的简历段落。
                        </p>
                      </div>
                    )}
                  </div>

                  {currentRefinedBullet && (
                    <div style={styles.previewCardFooter}>
                      <button 
                        onClick={() => handleCopyToClipboard(currentRefinedBullet)}
                        style={styles.previewBtnSecondary}
                      >
                        <Copy size={14} />
                        <span>{copySuccess ? "已复制" : "复制话术"}</span>
                      </button>
                      <button 
                        onClick={handleSaveDiary} 
                        style={styles.previewBtnPrimary}
                      >
                        <Save size={14} />
                        <span>{saveSuccess ? "已保存 ✔" : "保存到工作台"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* B. 工作台记忆 (时间线) */}
        {activePane === "timeline-pane" && (
          <div style={styles.paneContainer}>
            <div className="pane-header">
              <h1 className="pane-title">工作台记忆</h1>
              <p className="pane-desc">你所有保存的简历日记与 STAR 黄金素材都将沉淀在此处，供随时检索、修改与调取。</p>
            </div>

            {/* Filter Toolbar */}
            <div style={styles.toolbar}>
              <div style={styles.searchWrapper}>
                <Search size={16} style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="搜索原始记录或提炼话术..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>工作分类:</label>
                <div style={styles.filterTabs}>
                  {["全部", "日常工作", "项目历练", "学习提升", "其它"].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTimelineCategory(cat)}
                      style={timelineCategory === cat ? styles.filterTabActive : styles.filterTab}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showPinnedOnly}
                  onChange={(e) => setShowPinnedOnly(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>仅看收藏</span>
              </label>
            </div>

            {/* Diaries Timeline List */}
            <div style={styles.timelineContainer}>
              {loadingDiaries ? (
                <div style={styles.listSpinnerContainer}>
                  <div style={styles.spinner}></div>
                  <p>加载素材库...</p>
                </div>
              ) : filteredDiaries.length === 0 ? (
                <div style={styles.emptyContainer}>
                  <p style={styles.emptyText}>没有找到符合条件的简历素材。</p>
                  <button 
                    onClick={() => setActivePane("chat-pane")}
                    style={styles.emptyBtn}
                  >
                    去记录今天的第一条经历 <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div style={styles.timelineList}>
                  {filteredDiaries.map(diary => (
                    <div key={diary.id} className="glass-panel" style={styles.timelineCard}>
                      <div style={styles.cardHeader}>
                        <div style={styles.cardMeta}>
                          <span style={styles.cardDate}>
                            {new Date(diary.created_at).toLocaleDateString("zh-CN", {
                              year: "numeric",
                              month: "long",
                              day: "numeric"
                            })}
                          </span>
                          <span style={styles.categoryBadge}>{diary.category}</span>
                        </div>
                        <div style={styles.cardActions}>
                          <button 
                            onClick={() => handleTogglePin(diary)}
                            style={diary.is_pinned ? styles.actionBtnPinned : styles.actionBtn}
                            title={diary.is_pinned ? "取消收藏" : "收藏话术"}
                          >
                            <Star size={15} fill={diary.is_pinned ? "#ff9500" : "none"} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDiary(diary.id)}
                            style={styles.actionBtnDelete}
                            title="物理删除"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div style={styles.cardRow}>
                        {/* Raw Input */}
                        <div style={styles.cardCol}>
                          <span style={styles.colLabel}>原始经历记录：</span>
                          <p style={styles.colTextRaw}>{diary.raw_input}</p>
                        </div>

                        {/* Refined STAR bullet */}
                        <div style={styles.cardCol}>
                          <div style={styles.colLabelRow}>
                            <span style={styles.colLabelStar}>STAR 简历优化话术：</span>
                            {editingDiaryId !== diary.id ? (
                              <button 
                                onClick={() => handleStartEdit(diary)}
                                style={styles.editLinkBtn}
                              >
                                <Edit size={12} /> 编辑
                              </button>
                            ) : null}
                          </div>

                          {editingDiaryId === diary.id ? (
                            <div style={styles.editorContainer}>
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                style={styles.editArea}
                                rows={4}
                              />
                              <div style={styles.editorButtons}>
                                <button 
                                  onClick={() => setEditingDiaryId(null)}
                                  style={styles.editorBtnCancel}
                                >
                                  取消
                                </button>
                                <button 
                                  onClick={() => handleSaveEdit(diary.id)}
                                  style={styles.editorBtnSave}
                                >
                                  保存
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={styles.colTextRefined}>
                              {diary.refined_bullet}
                              <button 
                                onClick={() => handleCopyToClipboard(diary.refined_bullet)}
                                style={styles.innerCopyBtn}
                                title="复制话术"
                              >
                                <Copy size={12} /> 复制
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* C. 简历合成 */}
        {activePane === "generator-pane" && (
          <div style={styles.paneContainer}>
            <div className="pane-header">
              <h1 className="pane-title">简历一键合成</h1>
              <p className="pane-desc">自由挑选你的黄金经历，自动合成为标准 markdown 或纯文本格式，用于快捷投递或导出。</p>
            </div>

            <div style={styles.generatorWorkspace}>
              {/* Left: Checklist of diaries */}
              <div style={styles.selectorColumn}>
                <div style={styles.selectorHeader}>
                  <h3 style={styles.columnTitle}>选择要导出的经历</h3>
                  <button 
                    onClick={handleSelectAllDiaries}
                    style={styles.selectAllBtn}
                  >
                    {selectedDiaryIds.length === diaries.length ? "取消全选" : "全选全部"}
                  </button>
                </div>

                <div style={styles.selectorList}>
                  {diaries.length === 0 ? (
                    <p style={styles.selectorEmpty}>没有任何经历。请先在【今日记录】中提炼并保存记录！</p>
                  ) : (
                    diaries.map(diary => (
                      <label key={diary.id} style={styles.selectorItem}>
                        <input
                          type="checkbox"
                          checked={selectedDiaryIds.includes(diary.id)}
                          onChange={() => handleToggleSelectDiary(diary.id)}
                          style={styles.checkboxSquare}
                        />
                        <div style={styles.selectorItemDetails}>
                          <div style={styles.selectorItemMeta}>
                            <span style={styles.selectorItemDate}>
                              {new Date(diary.created_at).toLocaleDateString("zh-CN")}
                            </span>
                            <span style={styles.selectorItemCategory}>{diary.category}</span>
                          </div>
                          <p style={styles.selectorItemText}>{diary.refined_bullet}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Preview & export */}
              <div style={styles.previewColumn}>
                <div style={styles.previewColumnHeader}>
                  <h3 style={styles.columnTitle}>简历预览 (Markdown)</h3>
                  <button 
                    onClick={() => handleCopyToClipboard(generateResumeMarkdown())}
                    style={styles.copyResumeBtn}
                    disabled={diaries.length === 0}
                  >
                    {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copySuccess ? "复制成功" : "复制 Markdown"}</span>
                  </button>
                </div>

                <div className="glass-panel" style={styles.resumePreviewBox}>
                  <div style={styles.resumePaper}>
                    <ReactMarkdown>{generateResumeMarkdown()}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* D. 个人配置 */}
        {activePane === "settings-pane" && (
          <div style={styles.paneContainer}>
            <div className="pane-header">
              <h1 className="pane-title">个人配置中心</h1>
              <p className="pane-desc">定制你专属的职业画像与目标定位，AI 会根据你的设置调整深挖话术与优化方向。</p>
            </div>

            <div style={styles.settingsWorkspace}>
              <div className="glass-panel" style={styles.settingsCard}>
                <h3 style={styles.settingsSectionTitle}>🎯 简历画像与目标定位</h3>
                <form onSubmit={handleUpdateProfile} style={styles.settingsForm}>
                  
                  <div className="form-group">
                    <label className="form-label">姓名/称呼 (用于简历合成抬头)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={user?.display_name || ""}
                      onChange={(e) => setUser({ ...user, display_name: e.target.value })}
                      required
                    />
                  </div>

                  <div style={styles.formRow}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">当前所处行业</label>
                      <input
                        type="text"
                        className="input-field"
                        value={user?.industry || ""}
                        onChange={(e) => setUser({ ...user, industry: e.target.value })}
                        required
                        placeholder="例如：互联网科技/快消品零售/新能源制造"
                      />
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">当前具体岗位</label>
                      <input
                        type="text"
                        className="input-field"
                        value={user?.current_role || ""}
                        onChange={(e) => setUser({ ...user, current_role: e.target.value })}
                        required
                        placeholder="例如：研发工程师/前端架构/MTP管培生"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">目标求职岗位 (AI 话术优化核心依据)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={user?.target_role || ""}
                      onChange={(e) => setUser({ ...user, target_role: e.target.value })}
                      required
                      placeholder="例如：高级产品经理/海外销售经理/技术主管"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={styles.saveProfileBtn}>
                    保存画像设置 {profileSaveSuccess && "✔ 已保存"}
                  </button>
                </form>

                <hr style={styles.divider} />

                {/* API Settings */}
                <h3 style={styles.settingsSectionTitle}>🔑 AI 模型 API 配置 (双通道保障)</h3>
                <p style={styles.settingsDesc}>
                  默认使用服务器内置的 API 密钥。如果服务器内置密钥超额或你是在公网使用自己部署的独立版本，可以在此配置你的个人密钥（仅保存在你本地浏览器中，绝不上报）。
                </p>

                <div style={styles.apiKeySection}>
                  <div style={styles.apiKeyStatus}>
                    <Database size={15} />
                    <span>系统通道状态：</span>
                    {isLocalMode ? (
                      <span style={styles.statusYellow}>🟡 演示模式（可配置个人 Key 激活 AI）</span>
                    ) : (
                      <span style={styles.statusGreen}>🟢 专属云端服务已接入</span>
                    )}
                  </div>

                  <div className="form-group" style={{ marginTop: "12px" }}>
                    <label className="form-label">个人 Gemini API 密钥 (Optional)</label>
                    <input
                      type="password"
                      className="input-field"
                      value={customApiKey}
                      onChange={(e) => saveCustomApiKey(e.target.value)}
                      placeholder="AI Studio 获取的 API Key (AI 响应卡顿时可输入此密钥)"
                    />
                    <span style={styles.inputHelp}>
                      填入后将覆盖系统内置密钥。留空则自动使用服务器自带密钥。
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  loadingContainer: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f7",
    gap: "16px",
  },
  spinner: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "3px solid #e8e8ed",
    borderTopColor: "#0071e3",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: "14px",
    color: "#86868b",
  },
  logoutIconBtn: {
    background: "none",
    border: "none",
    color: "#86868b",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    marginLeft: "auto",
    ":hover": {
      backgroundColor: "#f5f5f7",
      color: "#ff3b30"
    }
  },
  paneContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
  },
  paneHeaderNoBorder: {
    padding: "24px 32px 16px 32px",
    borderBottom: "none",
    backgroundColor: "transparent"
  },
  chatWorkspace: {
    display: "flex",
    flex: 1,
    padding: "0 32px 32px 32px",
    gap: "24px",
    height: "calc(100% - 88px)",
    overflow: "hidden",
  },
  chatBox: {
    flex: 1.2,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e8e8ed",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
    height: "100%",
    overflow: "hidden",
  },
  chatMessages: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  userBubbleContainer: {
    display: "flex",
    flexDirection: "row-reverse",
    gap: "12px",
    alignItems: "flex-start",
  },
  modelBubbleContainer: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  userAvatarBubble: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "#0071e3",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modelAvatarBubble: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "#86868b",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  messageContent: {
    maxWidth: "80%",
  },
  userMessageText: {
    backgroundColor: "#0071e3",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "16px 4px 16px 16px",
    fontSize: "14px",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
  },
  modelMessageText: {
    backgroundColor: "#f5f5f7",
    color: "#1d1d1f",
    padding: "12px 18px",
    borderRadius: "4px 16px 16px 16px",
    fontSize: "14px",
    lineHeight: "1.6",
    boxShadow: "0 1px 2px rgba(0,0,0,0.01)",
  },
  chatRefinedHint: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "12px",
    padding: "6px 10px",
    backgroundColor: "rgba(0,113,227,0.05)",
    borderRadius: "8px",
    fontSize: "11px",
    color: "#0071e3",
    fontWeight: 500,
  },
  chatInputForm: {
    padding: "16px 24px 20px 24px",
    borderTop: "1px solid #e8e8ed",
    backgroundColor: "#ffffff",
  },
  chatInputWrapper: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #e8e8ed",
    borderRadius: "12px",
    padding: "8px 12px",
    backgroundColor: "#f5f5f7",
    gap: "10px",
  },
  chatTextarea: {
    flex: 1,
    border: "none",
    background: "none",
    resize: "none",
    fontSize: "14px",
    lineHeight: "1.4",
    maxHeight: "100px",
    outline: "none",
    color: "#1d1d1f",
    padding: "4px 0",
  },
  btnSendActive: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "#0071e3",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
  },
  btnSendDisabled: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "#e8e8ed",
    color: "#b0b0b5",
    border: "none",
    cursor: "not-allowed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  chatToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
  },
  btnResetChat: {
    background: "none",
    border: "none",
    color: "#86868b",
    fontSize: "11px",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#f5f5f7",
      color: "#1d1d1f"
    }
  },
  chatTip: {
    fontSize: "11px",
    color: "#86868b",
  },
  previewSidebar: {
    flex: 0.8,
    height: "100%",
  },
  previewCard: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  previewCardHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid rgba(232, 232, 237, 0.6)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewCardBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#0071e3",
  },
  categoryDropdown: {
    padding: "4px 8px",
    borderRadius: "8px",
    border: "1px solid #e8e8ed",
    backgroundColor: "#ffffff",
    fontSize: "12px",
    color: "#1d1d1f",
    outline: "none",
  },
  previewCardBody: {
    flex: 1,
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflowY: "auto",
  },
  placeholderContainer: {
    textAlign: "center",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  placeholderIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "rgba(0,113,227,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0071e3",
  },
  placeholderText: {
    fontSize: "12px",
    color: "#86868b",
    lineHeight: "1.6",
    maxWidth: "240px",
  },
  bulletBox: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  bulletBoxTitle: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#86868b",
  },
  bulletText: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#1d1d1f",
    whiteSpace: "pre-wrap",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(232, 232, 237, 0.4)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.01)",
    flex: 1,
    overflowY: "auto",
  },
  previewCardFooter: {
    padding: "16px 20px",
    borderTop: "1px solid rgba(232, 232, 237, 0.6)",
    display: "flex",
    gap: "12px",
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  previewBtnPrimary: {
    flex: 1.3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px",
    borderRadius: "10px",
    backgroundColor: "#0071e3",
    color: "#ffffff",
    border: "none",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    ":hover": {
      backgroundColor: "#0077ed"
    }
  },
  previewBtnSecondary: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px",
    borderRadius: "10px",
    backgroundColor: "#f5f5f7",
    color: "#1d1d1f",
    border: "1px solid #e8e8ed",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#e8e8ed"
    }
  },
  toolbar: {
    padding: "16px 32px",
    borderBottom: "1px solid #e8e8ed",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    minWidth: "260px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    color: "#86868b",
  },
  searchInput: {
    width: "100%",
    padding: "8px 12px 8px 36px",
    borderRadius: "8px",
    border: "1px solid #e8e8ed",
    fontSize: "13px",
    outline: "none",
    color: "#1d1d1f",
    ":focus": {
      borderColor: "#0071e3"
    }
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    fontSize: "13px",
    color: "#86868b",
  },
  filterTabs: {
    display: "flex",
    backgroundColor: "#f5f5f7",
    padding: "3px",
    borderRadius: "8px",
    border: "1px solid #e8e8ed",
  },
  filterTab: {
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "6px",
    border: "none",
    background: "none",
    color: "#86868b",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  filterTabActive: {
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: 500,
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#ffffff",
    color: "#0071e3",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    cursor: "default",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#1d1d1f",
    cursor: "pointer",
  },
  checkbox: {
    width: "14px",
    height: "14px",
  },
  timelineContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "32px",
    backgroundColor: "#f5f5f7",
  },
  timelineList: {
    maxWidth: "800px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  timelineCard: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(232,232,237,0.5)",
    paddingBottom: "12px",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  cardDate: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1d1d1f",
  },
  categoryBadge: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "20px",
    backgroundColor: "rgba(0,113,227,0.06)",
    color: "#0071e3",
    fontWeight: 500,
  },
  cardActions: {
    display: "flex",
    gap: "8px",
  },
  actionBtn: {
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #e8e8ed",
    backgroundColor: "#ffffff",
    color: "#86868b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#f5f5f7",
      color: "#ff9500"
    }
  },
  actionBtnPinned: {
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid rgba(255, 149, 0, 0.2)",
    backgroundColor: "rgba(255, 149, 0, 0.05)",
    color: "#ff9500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDelete: {
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #e8e8ed",
    backgroundColor: "#ffffff",
    color: "#86868b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "rgba(255,59,48,0.05)",
      borderColor: "rgba(255,59,48,0.1)",
      color: "#ff3b30"
    }
  },
  cardRow: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
  },
  cardCol: {
    flex: 1,
    minWidth: "280px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  colLabel: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#86868b",
  },
  colLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  colLabelStar: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#0071e3",
  },
  editLinkBtn: {
    background: "none",
    border: "none",
    color: "#86868b",
    fontSize: "11px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    ":hover": {
      color: "#0071e3"
    }
  },
  colTextRaw: {
    fontSize: "13px",
    lineHeight: "1.5",
    color: "#86868b",
    backgroundColor: "#fafafb",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px dashed #e8e8ed",
  },
  colTextRefined: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#1d1d1f",
    backgroundColor: "#ffffff",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #e8e8ed",
    position: "relative",
  },
  innerCopyBtn: {
    position: "absolute",
    bottom: "6px",
    right: "6px",
    background: "none",
    border: "none",
    color: "#86868b",
    fontSize: "10px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    padding: "2px 4px",
    borderRadius: "4px",
    backgroundColor: "#f5f5f7",
    ":hover": {
      backgroundColor: "#e8e8ed",
      color: "#1d1d1f"
    }
  },
  editorContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  editArea: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #0071e3",
    fontSize: "13px",
    lineHeight: "1.5",
    outline: "none",
    fontFamily: "var(--font-sans)",
  },
  editorButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
  editorBtnCancel: {
    padding: "4px 10px",
    borderRadius: "6px",
    backgroundColor: "#f5f5f7",
    color: "#86868b",
    border: "none",
    fontSize: "12px",
    cursor: "pointer",
  },
  editorBtnSave: {
    padding: "4px 10px",
    borderRadius: "6px",
    backgroundColor: "#0071e3",
    color: "#ffffff",
    border: "none",
    fontSize: "12px",
    cursor: "pointer",
  },
  listSpinnerContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
    gap: "12px",
    color: "#86868b",
    fontSize: "13px",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "60px 20px",
  },
  emptyText: {
    fontSize: "14px",
    color: "#86868b",
    marginBottom: "16px",
  },
  emptyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "8px",
    backgroundColor: "#0071e3",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
  },
  generatorWorkspace: {
    flex: 1,
    display: "flex",
    padding: "24px 32px 32px 32px",
    gap: "24px",
    height: "calc(100% - 88px)",
    overflow: "hidden",
  },
  selectorColumn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e8e8ed",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  selectorHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e8e8ed",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  columnTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1d1d1f",
  },
  selectAllBtn: {
    background: "none",
    border: "none",
    color: "#0071e3",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
  },
  selectorList: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  selectorEmpty: {
    fontSize: "12px",
    color: "#86868b",
    textAlign: "center",
    padding: "40px 10px",
  },
  selectorItem: {
    display: "flex",
    gap: "12px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #e8e8ed",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    backgroundColor: "#fafafb",
    ":hover": {
      backgroundColor: "#f5f5f7"
    }
  },
  checkboxSquare: {
    width: "16px",
    height: "16px",
    marginTop: "2px",
  },
  selectorItemDetails: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  selectorItemMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  selectorItemDate: {
    fontSize: "11px",
    fontWeight: 500,
    color: "#86868b",
  },
  selectorItemCategory: {
    fontSize: "10px",
    padding: "1px 6px",
    backgroundColor: "rgba(0,113,227,0.05)",
    color: "#0071e3",
    borderRadius: "10px",
  },
  selectorItemText: {
    fontSize: "12px",
    lineHeight: "1.4",
    color: "#1d1d1f",
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  previewColumn: {
    flex: 1.2,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  previewColumnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  copyResumeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #e8e8ed",
    color: "#0071e3",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    ":hover": {
      backgroundColor: "#f5f5f7"
    }
  },
  resumePreviewBox: {
    flex: 1,
    overflowY: "auto",
    padding: "30px",
    backgroundColor: "#ffffff",
    height: "100%",
  },
  resumePaper: {
    maxWidth: "600px",
    margin: "0 auto",
    color: "#1d1d1f",
    lineHeight: "1.6",
    fontSize: "14px",
  },
  settingsWorkspace: {
    flex: 1,
    overflowY: "auto",
    padding: "32px",
    backgroundColor: "#f5f5f7",
  },
  settingsCard: {
    maxWidth: "700px",
    margin: "0 auto",
    padding: "32px",
  },
  settingsSectionTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#1d1d1f",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  settingsDesc: {
    fontSize: "12px",
    color: "#86868b",
    lineHeight: "1.5",
    marginBottom: "16px",
  },
  settingsForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  formRow: {
    display: "flex",
    gap: "16px",
  },
  saveProfileBtn: {
    alignSelf: "flex-start",
    marginTop: "8px",
  },
  divider: {
    margin: "24px 0",
    border: "none",
    borderTop: "1px solid rgba(232,232,237,0.8)",
  },
  apiKeySection: {
    backgroundColor: "#f5f5f7",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e8e8ed",
  },
  apiKeyStatus: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#1d1d1f",
  },
  statusGreen: {
    color: "#34c759",
    fontWeight: 500,
  },
  statusYellow: {
    color: "#ff9500",
    fontWeight: 500,
  },
  inputHelp: {
    fontSize: "11px",
    color: "#86868b",
    marginTop: "4px",
  },
  limitBanner: {
    padding: "24px 20px",
    borderRadius: "16px",
    backgroundColor: "rgba(255, 59, 48, 0.04)",
    border: "1px solid rgba(255, 59, 48, 0.08)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    textAlign: "center",
    marginTop: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
  },
  limitText: {
    fontSize: "13px",
    color: "#ff3b30",
    fontWeight: 500,
    lineHeight: "1.6",
    margin: 0,
  },
  limitButtons: {
    display: "flex",
    gap: "10px",
    width: "100%",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  limitBtn: {
    padding: "10px 18px",
    borderRadius: "10px",
    backgroundColor: "#0071e3",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  limitBtnSecondary: {
    padding: "10px 18px",
    borderRadius: "10px",
    backgroundColor: "#ffffff",
    color: "#1d1d1f",
    fontSize: "13px",
    fontWeight: 500,
    border: "1px solid #e8e8ed",
    cursor: "pointer",
    transition: "all 0.2s ease",
  }
};
