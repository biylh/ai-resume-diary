"use strict";

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Briefcase, Target, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [industry, setIndustry] = useState("互联网IT");
  const [currentRole, setCurrentRole] = useState("产品助理");
  const [targetRole, setTargetRole] = useState("产品经理");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if Supabase is configured and if user is already logged in
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        setIsLocalMode(!data.supabaseConfigured);
        if (data.authenticated) {
          router.push("/");
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
    const payload = isLogin 
      ? { email, password } 
      : { email, password, displayName, industry, currentRole, targetRole };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "请求失败，请稍后重试");
      }

      // Redirect to home on success
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>初始化简历日记助手...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Dynamic Background Gradients */}
      <div style={styles.bgBlob1}></div>
      <div style={styles.bgBlob2}></div>

      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>
            <Sparkles size={20} />
          </div>
          <h1 style={styles.logoText}>AI 简历日记</h1>
        </div>

        <h2 style={styles.title}>{isLogin ? "欢迎回来" : "创建你的简历日记空间"}</h2>
        <p style={styles.subtitle}>
          {isLogin ? "用日记沉淀工作细节，让 AI 实时提炼高价值简历" : "通用版职业履历沉淀与 STAR 话术生成工具"}
        </p>

        {isLocalMode && (
          <div style={styles.localModeBanner}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>演示体验模式</strong>：免配置数据库即开即用。可以直接输入任意邮箱与 6 位密码登录或注册！
            </span>
          </div>
        )}

        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>邮箱地址</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>密码</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type="password"
                required
                placeholder="输入至少 6 位密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>真实姓名 / 昵称</label>
                <div style={styles.inputWrapper}>
                  <User size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    required
                    placeholder="例如：张经理 / 小明"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>当前行业</label>
                  <div style={styles.inputWrapper}>
                    <Briefcase size={16} style={styles.inputIcon} />
                    <input
                      type="text"
                      required
                      placeholder="互联网/传统制造"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>当前岗位</label>
                  <div style={styles.inputWrapper}>
                    <Briefcase size={16} style={styles.inputIcon} />
                    <input
                      type="text"
                      required
                      placeholder="当前职位/角色"
                      value={currentRole}
                      onChange={(e) => setCurrentRole(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>目标岗位 (AI 将基于此岗位要求提炼简历)</label>
                <div style={styles.inputWrapper}>
                  <Target size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    required
                    placeholder="期望投递/跳槽的岗位"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "处理中..." : isLogin ? "登录" : "注册并初始化"}
          </button>
        </form>

        <div style={styles.footer}>
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }} 
            style={styles.toggleBtn}
          >
            {isLogin ? "没有账户？立即注册" : "已有账户？直接登录"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f7",
    position: "relative",
    overflow: "hidden",
  },
  bgBlob1: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(0,113,227,0.08) 0%, rgba(255,255,255,0) 70%)",
    top: "-100px",
    right: "-100px",
    zIndex: 1,
  },
  bgBlob2: {
    position: "absolute",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(52,199,89,0.05) 0%, rgba(255,255,255,0) 70%)",
    bottom: "-150px",
    left: "-100px",
    zIndex: 1,
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    padding: "40px",
    borderRadius: "20px",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(232, 232, 237, 0.6)",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.04)",
    zIndex: 5,
    display: "flex",
    flexDirection: "column",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
  },
  logoIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #0071e3, #42a5f5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#1d1d1f",
    letterSpacing: "-0.2px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#1d1d1f",
    letterSpacing: "-0.5px",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#86868b",
    lineHeight: "1.5",
    marginBottom: "24px",
  },
  localModeBanner: {
    display: "flex",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "10px",
    backgroundColor: "rgba(0, 113, 227, 0.05)",
    border: "1px solid rgba(0, 113, 227, 0.1)",
    color: "#0071e3",
    fontSize: "12px",
    lineHeight: "1.5",
    marginBottom: "20px",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 59, 48, 0.05)",
    border: "1px solid rgba(255, 59, 48, 0.1)",
    color: "#ff3b30",
    fontSize: "12px",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formRow: {
    display: "flex",
    gap: "12px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#86868b",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "#86868b",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "10px 14px 10px 38px",
    borderRadius: "10px",
    border: "1px solid #e8e8ed",
    backgroundColor: "#ffffff",
    color: "#1d1d1f",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
  },
  submitBtn: {
    marginTop: "8px",
    padding: "12px",
    borderRadius: "10px",
    backgroundColor: "#0071e3",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  footer: {
    marginTop: "20px",
    textAlign: "center",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#0071e3",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
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
  }
};
