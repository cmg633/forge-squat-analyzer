"""
Generate a synthetic side-view squat video for testing.
Creates a stick figure performing 3 squat reps.
"""
import numpy as np
import cv2
import math

W, H = 640, 480
FPS = 30
DURATION = 12  # seconds
N_FRAMES = DURATION * FPS
N_REPS = 3

# Body proportions (relative to frame)
BODY = {
    "head_r": 0.04,       # head radius as fraction of H
    "torso_len": 0.22,
    "upper_leg_len": 0.22,
    "lower_leg_len": 0.22,
    "upper_arm_len": 0.12,
    "lower_arm_len": 0.10,
}

def squat_phase(t_phase):
    """Return squat depth 0=standing, 1=bottom, using smooth sine curve."""
    return (1 - math.cos(math.pi * t_phase)) / 2

def draw_stick_figure(frame, ankle_x, ankle_y, squat_depth, side="right"):
    """
    Draw a simplified side-view stick figure performing a squat.
    squat_depth: 0 = standing, 1 = fully squatted
    """
    ankle_px = int(ankle_x * W)
    ankle_py = int(ankle_y * H)

    # Foot
    foot_end = (ankle_px + 40, ankle_py)
    cv2.line(frame, (ankle_px, ankle_py), foot_end, (200, 200, 200), 3)

    # Knee angle: standing=175°, squat=70°
    knee_angle_deg = 175 - squat_depth * 100
    knee_angle_rad = math.radians(knee_angle_deg)

    # Shin
    shin_len = int(BODY["lower_leg_len"] * H)
    knee_x = ankle_px + int(math.sin(0.3 * squat_depth) * shin_len * 0.3)
    knee_y = ankle_py - int(math.cos(0.1) * shin_len)

    cv2.line(frame, (ankle_px, ankle_py), (knee_x, knee_y), (220, 180, 140), 4)

    # Thigh — angles forward as squat deepens
    thigh_len = int(BODY["upper_leg_len"] * H)
    # At bottom, hip goes back and down
    hip_offset_x = int(-squat_depth * 20)
    hip_offset_y = int(squat_depth * thigh_len * 0.6)
    hip_x = knee_x + hip_offset_x
    hip_y = knee_y - int(thigh_len * (1 - 0.4 * squat_depth))

    cv2.line(frame, (knee_x, knee_y), (hip_x, hip_y), (220, 180, 140), 4)

    # Torso — leans forward as squat deepens
    torso_len = int(BODY["torso_len"] * H)
    torso_angle_from_vertical = math.radians(squat_depth * 45)
    shoulder_x = hip_x - int(math.sin(torso_angle_from_vertical) * torso_len)
    shoulder_y = hip_y - int(math.cos(torso_angle_from_vertical) * torso_len)

    cv2.line(frame, (hip_x, hip_y), (shoulder_x, shoulder_y), (220, 180, 140), 5)

    # Head
    head_r = int(BODY["head_r"] * H)
    head_x = shoulder_x - 5
    head_y = shoulder_y - head_r - 3
    cv2.circle(frame, (head_x, head_y), head_r, (220, 180, 140), -1)

    # Upper arm
    arm_x = shoulder_x - 5
    arm_y = shoulder_y + 10
    elbow_x = arm_x + int(0.08 * W)
    elbow_y = arm_y + 20
    cv2.line(frame, (arm_x, arm_y), (elbow_x, elbow_y), (200, 160, 120), 3)

    # Lower arm / hands (on bar)
    cv2.line(frame, (elbow_x, elbow_y), (elbow_x + 20, elbow_y - 15), (200, 160, 120), 3)

    # Bar (on back)
    bar_x = shoulder_x + 5
    bar_y = shoulder_y - 5
    cv2.line(frame, (bar_x - 50, bar_y), (bar_x + 50, bar_y), (100, 100, 180), 4)
    cv2.circle(frame, (bar_x - 50, bar_y), 12, (60, 60, 140), -1)
    cv2.circle(frame, (bar_x + 50, bar_y), 12, (60, 60, 140), -1)

    # Landmark dots (simulating MediaPipe-like positions)
    # For test purposes, draw on key joints
    for pt in [(ankle_px, ankle_py), (knee_x, knee_y), (hip_x, hip_y), (shoulder_x, shoulder_y)]:
        cv2.circle(frame, pt, 5, (0, 100, 255), -1)


def generate_test_video(output_path: str, n_reps: int = 3):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, FPS, (W, H))

    # 3 reps over 12 seconds: 1s standing, 2s per rep (1s down, 1s up), 1s standing
    squat_start = FPS  # frame 30
    rep_frames = int((N_FRAMES - 2 * FPS) / n_reps)  # frames per rep

    for fi in range(N_FRAMES):
        frame = np.zeros((H, W, 3), dtype=np.uint8)
        frame[:] = (20, 20, 25)  # dark background

        # Draw floor line
        cv2.line(frame, (0, int(H * 0.88)), (W, int(H * 0.88)), (60, 60, 60), 2)

        # Compute squat depth for this frame
        t_offset = fi - squat_start
        squat_depth = 0.0

        if t_offset >= 0 and t_offset < N_FRAMES - 2 * FPS:
            rep_idx = int(t_offset / rep_frames)
            within_rep = (t_offset % rep_frames) / rep_frames  # 0-1
            if rep_idx < n_reps:
                # Down phase: first half; up phase: second half
                if within_rep < 0.5:
                    squat_depth = squat_phase(within_rep * 2)  # 0→1
                else:
                    squat_depth = squat_phase((1 - within_rep) * 2)  # 1→0

        draw_stick_figure(frame, 0.5, 0.86, squat_depth)

        # Frame counter
        cv2.putText(frame, f"Frame {fi}", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)
        cv2.putText(frame, f"Depth: {squat_depth:.2f}", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 200, 100), 1)

        out.write(frame)

    out.release()
    print(f"Test video written: {output_path} ({N_FRAMES} frames, {n_reps} reps, {DURATION}s)")


if __name__ == "__main__":
    import sys
    output = sys.argv[1] if len(sys.argv) > 1 else "/tmp/forge_test_squat.mp4"
    generate_test_video(output)

