# New implementation for the register_user function using proper async handling

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user.
    """
    try:
        # Check if username already exists - handle asynchronous execution correctly
        query = select(User).where(User.username == user_data.username)
        result = await db.execute(query)
        existing_user = result.first()  # Use .first() instead of .scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email already exists if provided
        if user_data.email:
            query = select(User).where(User.email == user_data.email)
            result = await db.execute(query)
            existing_email = result.first()
            
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        
        # Hash the password
        hashed_password = get_password_hash(user_data.password)
        
        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            name=user_data.name,
            phone=user_data.phone,
            hashed_password=hashed_password,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_verified=False,
            failed_login_attempts=0,
            role="user"
        )
        
        # Generate verification token if email provided
        if user_data.email:
            token, expires = generate_verification_token()
            new_user.verification_token = token
            new_user.verification_token_expires = expires
        
        # Save user to database
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Send verification email in background if email provided
        if user_data.email and new_user.verification_token:
            background_tasks.add_task(
                send_verification_email, 
                new_user.id, 
                new_user.email,
                new_user.name or new_user.username,
                new_user.verification_token,
                db
            )
        
        return new_user
        
    except Exception as e:
        logger.exception(f"Error in user registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User registration failed: {str(e)}"
        )
