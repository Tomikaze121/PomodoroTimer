import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  currentTime: string = '';
  interval: any;

  workMinutes = 25;
  workExtraSeconds = 0;
  breakMinutes = 5;
  breakExtraSeconds = 0;

  workDuration = 1500;
  breakDuration = 300;

  remainingTime: number = 0;
  countdownActive = false;
  isBreak = false;
  isPaused = false;

  timerInterval: any;
  backHandler: any;
  hasNotificationPermission = false;

  constructor(private platform: Platform, private ngZone: NgZone) {}

  async ngOnInit() {
    this.updateCurrentTime();
    this.interval = setInterval(() => this.updateCurrentTime(), 1000);

    this.backHandler = this.platform.backButton.subscribeWithPriority(9999, () => {
      CapacitorApp.exitApp();
    });

    // Request and check permissions
    try {
      const permissionStatus = await LocalNotifications.requestPermissions();
      this.hasNotificationPermission = permissionStatus.display === 'granted';
      
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'pomodoro-alerts',
          name: 'Pomodoro Alerts',
          importance: 5,
          description: 'Time reminders',
          visibility: 1,
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('Notification setup error:', error);
    }
  }

  ngOnDestroy() {
    clearInterval(this.interval);
    this.resetTimer();
    this.backHandler?.unsubscribe();
  }

  updateCurrentTime() {
    this.currentTime = new Date().toLocaleTimeString();
  }

  updateDurations() {
    this.workDuration = (this.workMinutes * 60) + this.workExtraSeconds;
    this.breakDuration = (this.breakMinutes * 60) + this.breakExtraSeconds;
    if (this.countdownActive && !this.isPaused) {
      this.resetTimer();
    }
  }

  async startPomodoroCycle() {
    this.updateDurations();
    this.resetTimer();
    this.remainingTime = this.isBreak ? this.breakDuration : this.workDuration;
    this.countdownActive = true;
    this.isPaused = false;
    
    // Only send notification if permission was granted
    if (this.hasNotificationPermission) {
      await this.sendNotification(
        `Work started for ${this.workMinutes}m ${this.workExtraSeconds}s`,
        true
      );
    }
    
    this.runTimer();
  }

  async togglePause() {
    if (this.countdownActive) {
      if (this.isPaused) {
        this.isPaused = false;
        this.runTimer();
        if (this.hasNotificationPermission) {
          await this.sendNotification('Timer resumed', true);
        }
      } else {
        clearInterval(this.timerInterval);
        this.isPaused = true;
        if (this.hasNotificationPermission) {
          await this.sendNotification('Timer paused', true);
        }
      }
    }
  }

  runTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (!this.isPaused && this.remainingTime > 0) {
          this.remainingTime--;
          
          // Send notification when 10 seconds remain
          if (this.hasNotificationPermission && this.remainingTime === 10) {
            this.sendNotification(
              `${this.isBreak ? 'Break' : 'Work'} ending in 10 seconds!`,
              false
            );
          }
        } else if (!this.isPaused && this.remainingTime <= 0) {
          clearInterval(this.timerInterval);
          this.switchMode();
        }
      });
    }, 1000);
  }

  async switchMode() {
    if (this.hasNotificationPermission) {
      const message = this.isBreak ? 'Break over! Time to work.' : 'Work done! Time for break.';
      await this.sendNotification(message, true);

      this.isBreak = !this.isBreak;
      this.remainingTime = this.isBreak ? this.breakDuration : this.workDuration;

      const nextMsg = this.isBreak
        ? `Break started for ${this.breakMinutes}m ${this.breakExtraSeconds}s`
        : `Work started for ${this.workMinutes}m ${this.workExtraSeconds}s`;
      await this.sendNotification(nextMsg, true);
    } else {
      this.isBreak = !this.isBreak;
      this.remainingTime = this.isBreak ? this.breakDuration : this.workDuration;
    }

    this.runTimer();
  }

  resetTimer() {
    clearInterval(this.timerInterval);
    this.countdownActive = false;
    this.isPaused = false;
    this.remainingTime = 0;
    this.isBreak = false;
    if (this.hasNotificationPermission) {
      this.sendNotification('Timer reset', true);
    }
  }

  async sendNotification(message: string, immediate: boolean = false) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: 'Pomodoro Timer',
            body: message,
            schedule: { at: new Date(Date.now() + (immediate ? 100 : 0)) },
            channelId: 'pomodoro-alerts',
            smallIcon: 'ic_launcher',
            sound: 'default',
          },
        ],
      });

      if ('vibrate' in navigator) {
        navigator.vibrate(300);
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${this.pad(m)}:${this.pad(s)}`;
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : n.toString();
  }
}