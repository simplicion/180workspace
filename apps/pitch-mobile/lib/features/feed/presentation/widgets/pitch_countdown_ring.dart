import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../core/theme/pitch_theme.dart';

class PitchCountdownRing extends StatelessWidget {
  final double currentSeconds;
  final double maxSeconds;
  final double size;

  PitchCountdownRing({
    super.key,
    required this.currentSeconds,
    double? maxSeconds,
    double? totalDurationSeconds,
    this.size = 54.0,
  }) : maxSeconds = totalDurationSeconds ?? maxSeconds ?? 180.0;

  @override
  Widget build(BuildContext context) {
    final progress = (currentSeconds / maxSeconds).clamp(0.0, 1.0);
    final remainingSeconds = (maxSeconds - currentSeconds).clamp(0.0, maxSeconds).toInt();

    Color ringColor;
    if (progress > 0.85) {
      ringColor = PitchTheme.accent; // Hot Pink alert
    } else if (progress > 0.65) {
      ringColor = PitchTheme.accentAmber; // Amber
    } else {
      ringColor = PitchTheme.primary; // Electric Indigo
    }

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _CountdownPainter(
              progress: progress,
              activeColor: ringColor,
              backgroundColor: Colors.white.withValues(alpha: 0.15),
              strokeWidth: 3.5,
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${remainingSeconds}s',
                style: TextStyle(
                  fontSize: size * 0.24,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                'PITCH',
                style: TextStyle(
                  fontSize: size * 0.14,
                  fontWeight: FontWeight.w900,
                  color: ringColor,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CountdownPainter extends CustomPainter {
  final double progress;
  final Color activeColor;
  final Color backgroundColor;
  final double strokeWidth;

  _CountdownPainter({
    required this.progress,
    required this.activeColor,
    required this.backgroundColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    // Draw background track
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawCircle(center, radius, bgPaint);

    // Draw active progress arc
    final activePaint = Paint()
      ..color = activeColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final sweepAngle = 2 * math.pi * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweepAngle,
      false,
      activePaint,
    );
  }

  @override
  bool shouldRepaint(covariant _CountdownPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.activeColor != activeColor;
  }
}
