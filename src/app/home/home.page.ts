import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform, ToastController } from '@ionic/angular';
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

  // Timer durations (in seconds)
  workDuration = 25 * 60; 
  breakDuration = 5 * 60; 
  
  // User inputs (in seconds)
  workSeconds = 25 * 60;
  breakSeconds = 5 * 60;

  remainingTime: number = 0;
  countdownActive = false;
  isBreak = false;
  isPaused = false;

  timerInterval: any;
  backHandler: any;

  constructor(
    private platform: Platform,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    this.updateCurrentTime();
    this.interval = setInterval(() => this.updateCurrentTime(), 1000);

    this.backHandler = this.platform.backButton.subscribeWithPriority(9999, () => {
      CapacitorApp.exitApp();
    });
  }

  ngOnDestroy() {
    clearInterval(this.interval);
    this.resetTimer();
    this.backHandler.unsubscribe();
  }

  updateCurrentTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString();
  }

  updateDurations() {
    this.workDuration = this.workSeconds;
    this.breakDuration = this.breakSeconds;
    if (this.countdownActive && !this.isPaused) {
      this.resetTimer();
    }
  }

  async startPomodoroCycle() {
    this.updateDurations();
    this.resetTimer();
    this.remainingTime = this.workDuration;
    this.isBreak = false;
    this.countdownActive = true;
    this.isPaused = false;
    await this.showToast(`Work started for ${this.formatSeconds(this.workDuration)}`);
    this.runTimer();
  }

  async togglePause() {
    if (this.countdownActive) {
      if (this.isPaused) {
        this.isPaused = false;
        this.runTimer();
        await this.showToast('Timer resumed');
      } else {
        clearInterval(this.timerInterval);
        this.isPaused = true;
        await this.showToast('Timer paused');
      }
    }
  }

  runTimer() {
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && this.remainingTime > 0) {
        this.remainingTime--;
        
        if (this.remainingTime === 5) {
          const msg = this.isBreak 
            ? 'Break ending in 5 seconds!' 
            : 'Work ending in 5 seconds!';
          this.showToast(msg);
        }
      } else if (!this.isPaused && this.remainingTime <= 0) {
        clearInterval(this.timerInterval);
        const message = this.isBreak 
          ? 'Break over! Time to work.' 
          : 'Work done! Time for break.';
        this.showToast(message);
        
        this.isBreak = !this.isBreak;
        this.remainingTime = this.isBreak ? this.breakDuration : this.workDuration;
        
        const nextPhaseMsg = this.isBreak
          ? `Break started for ${this.formatSeconds(this.breakDuration)}`
          : `Work started for ${this.formatSeconds(this.workDuration)}`;
        this.showToast(nextPhaseMsg);
        
        this.runTimer();
      }
    }, 1000);
  }

  resetTimer() {
    clearInterval(this.timerInterval);
    this.countdownActive = false;
    this.isPaused = false;
    this.remainingTime = 0;
    this.isBreak = false;
    this.showToast('Timer reset');
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: this.isBreak ? 'success' : 'primary'
    });
    await toast.present();
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${this.pad(m)}:${this.pad(s)}`;
  }

  formatSeconds(seconds: number): string {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  

  pad(n: number): string {
    return n < 10 ? '0' + n : n.toString();
  }
}