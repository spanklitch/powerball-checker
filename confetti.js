// Simple confetti animation for PowerBall Find Me!

function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ff9800', '#e53935', '#ffffff'];
    const numPieces = 150;

    // Create confetti pieces
    for (let i = 0; i < numPieces; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            rotation: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5,
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotationSpeed: Math.random() * 10 - 5,
            shape: Math.random() > 0.5 ? 'rect' : 'circle'
        });
    }

    let animationFrame;
    let startTime = Date.now();
    const duration = 4000; // 4 seconds

    function animate() {
        const elapsed = Date.now() - startTime;

        if (elapsed > duration) {
            cancelAnimationFrame(animationFrame);
            canvas.remove();
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        pieces.forEach(piece => {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate((piece.rotation * Math.PI) / 180);
            ctx.fillStyle = piece.color;

            if (piece.shape === 'rect') {
                ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();

            // Update position
            piece.y += piece.speedY;
            piece.x += piece.speedX;
            piece.rotation += piece.rotationSpeed;

            // Add some wobble
            piece.speedX += Math.random() * 0.2 - 0.1;

            // Reset if off screen
            if (piece.y > canvas.height + 20) {
                piece.y = -20;
                piece.x = Math.random() * canvas.width;
            }
        });

        animationFrame = requestAnimationFrame(animate);
    }

    animate();
}

// Export for use in main app
window.launchConfetti = launchConfetti;
