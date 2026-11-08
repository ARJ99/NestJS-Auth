import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {

    private resend: Resend

    constructor(private configService: ConfigService) {
        this.resend = new Resend(this.configService.get("RESEND_API_KEY"))
    }

    async sendVerificationEmail(email: string, token: string) {
        const appUrl = this.configService.get<string>("APP_URL");
        const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

        await this.resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Verify yoru email",
            html: `
                <h2>Welcome, Please verify your email</h2>
                <p>Click the link below to verify your email adress. This link expires in 24h. </p>
                <a href="${verificationUrl}">Verify your Email</a>
                <p>If you didn't create an account, you can safely ignore this email.</p>
            `,
        })
    }

    async sendPasswordResetEmail(email: string, token: string) {
        const appUrl = this.configService.get<string>("APP_URL");
        const resetUrl = `${appUrl}/api/auth/reset-password?token=${token}`;

        await this.resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Resent your password",
            html: `
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password. This link expires in 1h.</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
            `,
        })
    }
}