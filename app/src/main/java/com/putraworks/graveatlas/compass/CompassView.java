package com.putraworks.graveatlas.compass;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.util.AttributeSet;
import android.view.View;

/**
 * Compass view with smooth heading animation, full degree markings,
 * cardinal + intercardinal labels, and accuracy ring.
 * Adapted from NurOne-v4 QiblaCompassView — Kaaba indicator removed.
 */
public class CompassView extends View {

    private float heading = 0f;
    private float targetHeading = 0f;
    private int sensorAccuracy = 2;

    // Low-pass smoothing
    private float smoothedHeading = 0f;
    private static final float ALPHA = 0.25f;

    // Paints
    private Paint outerRingPaint, innerRingPaint;
    private Paint majorTickPaint, minorTickPaint;
    private Paint cardinalPaint, interCardinalPaint, degreePaint;
    private Paint needlePaint, needleOutlinePaint;
    private Paint centerDotPaint, accuracyPaint;
    private Paint bgCirclePaint;

    public CompassView(Context ctx, AttributeSet attrs) {
        super(ctx, attrs);
        init();
    }

    public CompassView(Context ctx) {
        super(ctx);
        init();
    }

    private void init() {
        float density = getResources().getDisplayMetrics().density;

        bgCirclePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bgCirclePaint.setStyle(Paint.Style.FILL);
        bgCirclePaint.setColor(0xFF161310);

        outerRingPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        outerRingPaint.setStyle(Paint.Style.STROKE);
        outerRingPaint.setColor(0xFFE0A845);
        outerRingPaint.setStrokeWidth(3f * density);

        innerRingPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        innerRingPaint.setStyle(Paint.Style.STROKE);
        innerRingPaint.setColor(0x44E0A845);
        innerRingPaint.setStrokeWidth(1f * density);

        majorTickPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        majorTickPaint.setStyle(Paint.Style.STROKE);
        majorTickPaint.setColor(0xFFE0A845);
        majorTickPaint.setStrokeWidth(2.5f * density);

        minorTickPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        minorTickPaint.setStyle(Paint.Style.STROKE);
        minorTickPaint.setColor(0xFF6E6B67);
        minorTickPaint.setStrokeWidth(1f * density);

        cardinalPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        cardinalPaint.setColor(0xFFF5F1E8);
        cardinalPaint.setTextSize(30f * density);
        cardinalPaint.setTextAlign(Paint.Align.CENTER);
        cardinalPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));

        interCardinalPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        interCardinalPaint.setColor(0xFFA8A5A0);
        interCardinalPaint.setTextSize(16f * density);
        interCardinalPaint.setTextAlign(Paint.Align.CENTER);

        degreePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        degreePaint.setColor(0xFF6E6B67);
        degreePaint.setTextSize(10f * density);
        degreePaint.setTextAlign(Paint.Align.CENTER);

        needlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        needlePaint.setStyle(Paint.Style.FILL);
        needlePaint.setColor(0xFFE0A845);

        needleOutlinePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        needleOutlinePaint.setStyle(Paint.Style.STROKE);
        needleOutlinePaint.setColor(0xFFFFD700);
        needleOutlinePaint.setStrokeWidth(1.5f * density);

        centerDotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        centerDotPaint.setStyle(Paint.Style.FILL);
        centerDotPaint.setColor(0xFFE0A845);

        accuracyPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        accuracyPaint.setStyle(Paint.Style.STROKE);
        accuracyPaint.setStrokeWidth(4f * density);
    }

    public void setHeading(float h) {
        targetHeading = h;
        // Smooth heading: take shortest rotation path
        float diff = targetHeading - smoothedHeading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        smoothedHeading += diff * ALPHA;
        if (smoothedHeading < 0) smoothedHeading += 360;
        if (smoothedHeading >= 360) smoothedHeading -= 360;
        heading = smoothedHeading;
        invalidate();
    }

    public void setSensorAccuracy(int acc) { sensorAccuracy = acc; invalidate(); }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float density = getResources().getDisplayMetrics().density;
        int w = getWidth(), h = getHeight();
        float cx = w / 2f, cy = h / 2f;
        float radius = Math.min(cx, cy) - 20f;
        if (radius < 80f) radius = 80f;

        // Background circle
        canvas.drawCircle(cx, cy, radius + 12f, bgCirclePaint);

        // Accuracy ring color
        int accColor;
        switch (sensorAccuracy) {
            case 3: accColor = 0xFF4CAF50; break;
            case 2: accColor = 0xFFFF9800; break;
            case 1: accColor = 0xFFFF5722; break;
            default: accColor = 0xFFB71C1C; break;
        }
        accuracyPaint.setColor(accColor);

        // Outer accuracy ring
        RectF accArc = new RectF(cx - radius - 6f, cy - radius - 6f, cx + radius + 6f, cy + radius + 6f);
        canvas.drawArc(accArc, -90, 360, false, accuracyPaint);

        // Inner decorative rings
        canvas.drawCircle(cx, cy, radius, outerRingPaint);
        canvas.drawCircle(cx, cy, radius - 8f * density, innerRingPaint);

        // Rotate compass face
        canvas.save();
        canvas.rotate(-heading, cx, cy);

        // Tick marks
        for (int i = 0; i < 360; i += 10) {
            float angle = (float) Math.toRadians(i - 90);
            boolean isMajor = (i % 90 == 0);
            boolean isMid = (i % 30 == 0);
            float tickLen;
            Paint tp;
            if (isMajor) { tickLen = 18f * density; tp = majorTickPaint; }
            else if (isMid) { tickLen = 12f * density; tp = majorTickPaint; }
            else { tickLen = 7f * density; tp = minorTickPaint; }

            float x1 = cx + (float) Math.cos(angle) * (radius - tickLen);
            float y1 = cy + (float) Math.sin(angle) * (radius - tickLen);
            float x2 = cx + (float) Math.cos(angle) * (radius - 2f);
            float y2 = cy + (float) Math.sin(angle) * (radius - 2f);
            canvas.drawLine(x1, y1, x2, y2, tp);
        }

        // Degree labels
        for (int i = 0; i < 360; i += 30) {
            float angle = (float) Math.toRadians(i - 90);
            float tx = cx + (float) Math.cos(angle) * (radius - 28f * density);
            float ty = cy + (float) Math.sin(angle) * (radius - 28f * density) + 4f * density;
            String label = (i == 0) ? "N" : (i == 90) ? "E" : (i == 180) ? "S" : (i == 270) ? "W" : String.valueOf(i);
            if (i == 0 || i == 90 || i == 180 || i == 270) {
                canvas.drawText(label, tx, ty, cardinalPaint);
            } else {
                canvas.drawText(label, tx, ty, degreePaint);
            }
        }

        // Intercardinal labels
        String[] interDirs = {"NE", "SE", "SW", "NW"};
        for (int i = 0; i < 4; i++) {
            float angle = (float) Math.toRadians(i * 90 + 45 - 90);
            float tx = cx + (float) Math.cos(angle) * (radius - 28f * density);
            float ty = cy + (float) Math.sin(angle) * (radius - 28f * density) + 5f * density;
            canvas.drawText(interDirs[i], tx, ty, interCardinalPaint);
        }

        canvas.restore();

        // Draw North needle (points to magnetic/true North)
        canvas.save();
        canvas.rotate(-heading, cx, cy);

        float needleLen = radius - 40f * density;
        float needleWidth = 14f * density;

        // Needle shadow
        Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        shadowPaint.setStyle(Paint.Style.FILL);
        shadowPaint.setColor(0x44000000);
        Path shadow = new Path();
        shadow.moveTo(cx + 1f, cy - needleLen + 1f);
        shadow.lineTo(cx - needleWidth + 1f, cy + 2f);
        shadow.lineTo(cx + needleWidth + 1f, cy + 2f);
        shadow.close();
        canvas.drawPath(shadow, shadowPaint);

        // North needle (red tip pointing North)
        Paint northNeedlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        northNeedlePaint.setStyle(Paint.Style.FILL);
        northNeedlePaint.setColor(0xFFD32F2F);
        Path northNeedle = new Path();
        northNeedle.moveTo(cx, cy - needleLen);
        northNeedle.lineTo(cx - needleWidth, cy);
        northNeedle.lineTo(cx + needleWidth, cy);
        northNeedle.close();
        canvas.drawPath(northNeedle, northNeedlePaint);

        // South needle (gold tip)
        Paint southNeedlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        southNeedlePaint.setStyle(Paint.Style.FILL);
        southNeedlePaint.setColor(0xFFE0A845);
        Path southNeedle = new Path();
        southNeedle.moveTo(cx, cy + needleLen);
        southNeedle.lineTo(cx - needleWidth, cy);
        southNeedle.lineTo(cx + needleWidth, cy);
        southNeedle.close();
        canvas.drawPath(southNeedle, southNeedlePaint);

        // Needle outline
        canvas.drawPath(northNeedle, needleOutlinePaint);

        canvas.restore();

        // Center dot
        canvas.drawCircle(cx, cy, 6f * density, centerDotPaint);
        Paint innerDot = new Paint(Paint.ANTI_ALIAS_FLAG);
        innerDot.setStyle(Paint.Style.FILL);
        innerDot.setColor(0xFF161310);
        canvas.drawCircle(cx, cy, 3f * density, innerDot);
    }
}
