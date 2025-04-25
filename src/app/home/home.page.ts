import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapacitorApp } from '@capacitor/app';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone:false,
})
export class HomePage implements OnInit, OnDestroy {
  currentTime: string = '';
  interval: any;

  pomodoroDuration = 25 * 60;
  breakDuration = 5 * 60;

  remainingTime: number = 0;
  countdownActive = false;
  isBreak = false;

  timerInterval: any;
  backHandler: any;

  constructor(private platform: Platform) {}

  ngOnInit() {
    this.updateCurrentTime();
    this.interval = setInterval(() => this.updateCurrentTime(), 1000);

    this.backHandler = this.platform.backButton.subscribeWithPriority(9999, () => {
      CapacitorApp.exitApp();
    });
  }

  ngOnDestroy() {
    clearInterval(this.interval);
    clearInterval(this.timerInterval);
    this.backHandler.unsubscribe();
  }

  updateCurrentTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString();
  }

  startPomodoroCycle() {
    this.remainingTime = this.pomodoroDuration;
    this.isBreak = false;
    this.countdownActive = true;
    this.runTimer();
  }

  runTimer() {
    this.timerInterval = setInterval(() => {
      if (this.remainingTime > 0) {
        this.remainingTime--;
      } else {
        clearInterval(this.timerInterval);
        this.sendNotification(this.isBreak ? 'Break over! Time to focus again.' : 'Pomodoro done! Take a short break.');
        this.isBreak = !this.isBreak;
        this.remainingTime = this.isBreak ? this.breakDuration : this.pomodoroDuration;
        this.runTimer();
      }
    }, 1000);
  }

  sendNotification(message: string) {
    LocalNotifications.schedule({
      notifications: [
        {
          title: 'PomodoroApp',
          body: message,
          id: new Date().getTime(),
          sound: 'beep.aiff',
          schedule: { at: new Date() },
          smallIcon: 'ic_stat_icon_config_sample',
        }
      ]
    });

    // Optional vibration (for Android)
    if (navigator.vibrate) {
      navigator.vibrate(1000);
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
