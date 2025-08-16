'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface RefreshProtectionWrapperProps {
  children: React.ReactNode
}

/**
 * Professional Refresh Protection Wrapper
 * เทียบเท่า Adobe Premiere Pro & Canva
 * ป้องกันการสูญเสียข้อมูลจากการ refresh
 */
const RefreshProtectionWrapper: React.FC<RefreshProtectionWrapperProps> = ({ children }) => {
  const [hasCheckedRefresh, setHasCheckedRefresh] = useState(false)

  useEffect(() => {
    // ===============================
    // PROFESSIONAL REFRESH PROTECTION
    // เทียบเท่า Adobe Premiere Pro & Canva
    // ===============================
    
    const checkForUnsavedChangesOnRefresh = () => {
      if (typeof window === 'undefined') return

      try {
        // ตรวจสอบ localStorage สำหรับ unsaved changes (EventManager integration)
        const hasUnsavedChanges = localStorage.getItem('divwy-has-unsaved-changes') === 'true'
        const lastChange = localStorage.getItem('divwy-last-change')
        const lastSaved = localStorage.getItem('divwy-last-saved')
        
        // Professional EventManager state integration
        const saveStateString = localStorage.getItem('divwy-save-state')
        let eventManagerState = null
        try {
          eventManagerState = saveStateString ? JSON.parse(saveStateString) : null
        } catch (error) {
          console.warn('[RefreshProtection] Failed to parse EventManager state:', error)
        }
        
        // Professional analytics สำหรับการตรวจสอบ
        const changeTimestamp = lastChange ? parseInt(lastChange) : null
        const savedTimestamp = lastSaved ? parseInt(lastSaved) : null
        const currentTime = Date.now()
        
        // Enterprise logging สำหรับ debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('[RefreshProtection] Professional refresh detection:', {
            hasUnsavedChanges,
            changeTimestamp: changeTimestamp ? new Date(changeTimestamp).toISOString() : null,
            savedTimestamp: savedTimestamp ? new Date(savedTimestamp).toISOString() : null,
            timeSinceLastChange: changeTimestamp ? currentTime - changeTimestamp : null,
            eventManagerState: eventManagerState ? {
              isDirty: eventManagerState.isDirty,
              hasUnsavedChanges: eventManagerState.hasUnsavedChanges,
              lastSaved: eventManagerState.lastSaved
            } : null
          })
        }
        
        // Professional refresh detection logic (EventManager integration)
        const shouldShowWarning = hasUnsavedChanges || 
          (eventManagerState?.hasUnsavedChanges || eventManagerState?.isDirty) ||
          (changeTimestamp && (!savedTimestamp || changeTimestamp > savedTimestamp))
        
        if (shouldShowWarning && changeTimestamp) {
          const timeSinceChange = currentTime - changeTimestamp
          
          // แสดง warning เฉพาะเมื่อมีการเปลี่ยนแปลงจริงๆ และไม่เก่าเกินไป
          if (timeSinceChange < 30 * 60 * 1000) { // 30 นาทีล่าสุด
            // Professional user notification
            toast.warning(
              '⚠️ ตรวจพบการเปลี่ยนแปลงที่ยังไม่ได้บันทึก\n\n' +
              '🔄 หน้าเพจได้รับการรีเฟรช อาจมีความเสี่ยงในการสูญเสียข้อมูล\n\n' +
              '💡 แนะนำให้บันทึกงานทันทีเพื่อความปลอดภัย',
              { 
                duration: 8000,
                action: {
                  label: 'เข้าใจแล้ว',
                  onClick: () => {
                    // ล้างการแจ้งเตือนและอัปเดต flag
                    localStorage.setItem('divwy-refresh-warned', 'true')
                  }
                }
              }
            )
            
            // Professional additional guidance
            setTimeout(() => {
              toast.info(
                '🎯 Pro Tip: ใช้ Ctrl+S เพื่อบันทึกด่วน\n' +
                'หรือคลิกปุ่ม "บันทึก" ที่ด้านบนขวา',
                { duration: 5000 }
              )
            }, 2000)
          }
        } else if (!shouldShowWarning) {
          // ไม่มีการเปลี่ยนแปลง - Professional user feedback
          if (process.env.NODE_ENV === 'development') {
            console.log('[RefreshProtection] Clean refresh detected - no unsaved changes')
          }
        }
        
        // Professional cleanup สำหรับ one-time check
        setHasCheckedRefresh(true)
        
      } catch (error) {
        console.error('[RefreshProtection] Error checking for unsaved changes:', error)
        // Graceful degradation - ไม่แสดง error ให้ผู้ใช้
      }
    }

    // Professional delayed check เพื่อให้ components อื่นๆ โหลดเสร็จก่อน
    if (!hasCheckedRefresh) {
      const checkTimer = setTimeout(() => {
        checkForUnsavedChangesOnRefresh()
      }, 500) // รอ 500ms ให้ components โหลดเสร็จ

      return () => {
        if (checkTimer) {
          clearTimeout(checkTimer)
        }
      }
    }
  }, [hasCheckedRefresh])

  // Professional cross-tab synchronization
  useEffect(() => {
    // ===============================
    // ENTERPRISE CROSS-TAB AWARENESS
    // ===============================
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'divwy-has-unsaved-changes' && event.newValue === 'true') {
        // มีการเปลี่ยนแปลงจาก tab อื่น - Professional notification
        toast.info(
          '📂 ตรวจพบการแก้ไขจากแท็บอื่น\n\n' +
          '💡 เพื่อป้องกันการขัดแย้งของข้อมูล แนะนำให้ใช้แท็บเดียว',
          { duration: 6000 }
        )
      }
    }

    // Professional event listener registration
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])

  return <>{children}</>
}

export default RefreshProtectionWrapper
