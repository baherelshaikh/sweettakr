const jwtHandling = (user)=>{
    return {name: user.name, 
        user_id: user.id,
        profile_picture: user.profile_picture,
    }
}

module.exports = {jwtHandling}