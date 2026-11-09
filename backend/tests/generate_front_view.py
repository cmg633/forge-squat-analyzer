"""
Generate a front-view squat video to test the quality gate and 'cannot assess' logic.
In a front view, shoulders and hips have large horizontal spread.
"""
import cv2
import numpy as np
import math

W, H = 640, 480
FPS = 30
DURATION = 8  # 8 seconds
N_FRAMES = DURATION * FPS

def generate_front_view_video(output_path: str):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, FPS, (W, H))

    for fi in range(N_FRAMES):
        frame = np.zeros((H, W, 3), dtype=np.uint8)
        frame[:] = (20, 20, 25)

        # Floor
        cv2.line(frame, (0, int(H * 0.88)), (W, int(H * 0.88)), (60, 60, 60), 2)

        # Squat phase: 1 rep over 8s
        phase = (1 - math.cos(2 * math.pi * fi / N_FRAMES)) / 2  # 0 -> 1 -> 0

        # Front view coordinates
        cx = W // 2
        head_y = int(100 + phase * 60)
        shoulder_y = head_y + 35
        hip_y = int(240 + phase * 80)
        knee_y = int(340 + phase * 30)
        ankle_y = int(H * 0.86)

        # Head
        cv2.circle(frame, (cx, head_y), 18, (220, 180, 140), -1)

        # Front view shoulders (wide horizontal spread ~120px)
        ls = (cx - 65, shoulder_y)
        rs = (cx + 65, shoulder_y)
        cv2.line(frame, ls, rs, (220, 180, 140), 5)

        # Bar across shoulders
        cv2.line(frame, (cx - 140, shoulder_y - 5), (cx + 140, shoulder_y - 5), (120, 120, 180), 5)
        cv2.circle(frame, (cx - 140, shoulder_y - 5), 16, (80, 80, 140), -1)
        cv2.circle(frame, (cx + 140, shoulder_y - 5), 16, (80, 80, 140), -1)

        # Torso
        lh = (cx - 40, hip_y)
        rh = (cx + 40, hip_y)
        cv2.line(frame, ls, lh, (220, 180, 140), 4)
        cv2.line(frame, rs, rh, (220, 180, 140), 4)
        cv2.line(frame, lh, rh, (220, 180, 140), 4)

        # Legs (front view: thighs and shins spread out)
        lk = (cx - 55, knee_y)
        rk = (cx + 55, knee_y)
        la = (cx - 50, ankle_y)
        ra = (cx + 50, ankle_y)
        cv2.line(frame, lh, lk, (220, 180, 140), 4)
        cv2.line(frame, rh, rk, (220, 180, 140), 4)
        cv2.line(frame, lk, la, (220, 180, 140), 4)
        cv2.line(frame, rk, ra, (220, 180, 140), 4)

        # Feet
        cv2.line(frame, la, (la[0] - 25, la[1]), (200, 200, 200), 3)
        cv2.line(frame, ra, (ra[0] + 25, ra[1]), (200, 200, 200), 3)

        cv2.putText(frame, "FRONT VIEW TEST (Should Fail Side-View Gate)", (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        out.write(frame)

    out.release()
    print(f"Generated hard front-view video: {output_path}")

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "backend/tests/hard_front_view.mp4"
    generate_front_view_video(out)

