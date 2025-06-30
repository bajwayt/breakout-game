import { Position, Velocity, Ball, Paddle, Block } from '../types/game';

export const checkCollision = (
  ballPos: Position,
  ballRadius: number,
  rectPos: Position,
  rectWidth: number,
  rectHeight: number
): boolean => {
  const closestX = Math.max(rectPos.x, Math.min(ballPos.x, rectPos.x + rectWidth));
  const closestY = Math.max(rectPos.y, Math.min(ballPos.y, rectPos.y + rectHeight));
  
  const distanceX = ballPos.x - closestX;
  const distanceY = ballPos.y - closestY;
  
  return (distanceX * distanceX + distanceY * distanceY) <= (ballRadius * ballRadius);
};

export const getCollisionSide = (
  ballPos: Position,
  ballRadius: number,
  rectPos: Position,
  rectWidth: number,
  rectHeight: number
): 'top' | 'bottom' | 'left' | 'right' => {
  const ballCenterX = ballPos.x;
  const ballCenterY = ballPos.y;
  const rectCenterX = rectPos.x + rectWidth / 2;
  const rectCenterY = rectPos.y + rectHeight / 2;
  
  const deltaX = ballCenterX - rectCenterX;
  const deltaY = ballCenterY - rectCenterY;
  
  const ratioX = deltaX / (rectWidth / 2 + ballRadius);
  const ratioY = deltaY / (rectHeight / 2 + ballRadius);
  
  if (Math.abs(ratioX) > Math.abs(ratioY)) {
    return deltaX > 0 ? 'right' : 'left';
  } else {
    return deltaY > 0 ? 'bottom' : 'top';
  }
};

export const updateBallPosition = (
  ball: Ball,
  canvasWidth: number,
  canvasHeight: number,
  deltaTime: number
): Ball => {
  const newPosition = {
    x: ball.position.x + ball.velocity.x * deltaTime,
    y: ball.position.y + ball.velocity.y * deltaTime
  };
  
  let newVelocity = { ...ball.velocity };
  
  // Wall collisions
  if (newPosition.x - ball.radius <= 0 || newPosition.x + ball.radius >= canvasWidth) {
    newVelocity.x = -newVelocity.x;
    newPosition.x = Math.max(ball.radius, Math.min(canvasWidth - ball.radius, newPosition.x));
  }
  
  if (newPosition.y - ball.radius <= 0) {
    newVelocity.y = -newVelocity.y;
    newPosition.y = ball.radius;
  }
  
  // Update trail
  const newTrail = [ball.position, ...ball.trail.slice(0, 8)];
  
  return {
    ...ball,
    position: newPosition,
    velocity: newVelocity,
    trail: newTrail
  };
};

export const handlePaddleCollision = (ball: Ball, paddle: Paddle): Ball => {
  if (!checkCollision(ball.position, ball.radius, paddle.position, paddle.width, paddle.height)) {
    return ball;
  }
  
  // Calculate hit position on paddle (0 to 1)
  const hitPos = (ball.position.x - paddle.position.x) / paddle.width;
  const hitAngle = (hitPos - 0.5) * Math.PI * 0.6; // Max 54 degrees
  
  const speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
  
  return {
    ...ball,
    velocity: {
      x: Math.sin(hitAngle) * speed,
      y: -Math.abs(Math.cos(hitAngle) * speed)
    },
    position: {
      ...ball.position,
      y: paddle.position.y - ball.radius - 1
    }
  };
};