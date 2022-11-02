const SocketIO = require("socket.io");
module.exports = (server) => {
  //const io = SocketIO(server);
  const io = SocketIO(server, { path: "/socket.io/tit-for-tat/" });
  const playResultInit = { isP1End: false, p1NickName: "", p1Choice: "", p1Score: 0, isP2End: false, p2NickName: "", p2Choice: "", p2Score: 0 }; // 결과 초기화용

  const lastRound = 5; // 마지막 라운드 ( 개선점: client 방장 설정값의 근사치로 랜덤생성하게 -> 나중에 추가 ??? )
  let playResultInfo = {}; // 이번라운드결과
  let p1TotScore = 0; // p1 총점
  let p2TotScore = 0; // p2 총점

  io.on("connection", (socket) => {
    connectProcess(); // 최초 연결시, 로그인 유저목록 전송

    /**
     * on join user
     * @param tempLoginId : temp id
     * @return
     */
    socket.on("join user", (tempLoginId) => {
      joinUserProcess(tempLoginId);
    });

    /**
     * on enter game
     * @param nickName : login nickName
     * @return
     */
    socket.on("enter game", (nickName) => {
      enterGameProcess(nickName);
    });

    /**
     * on play game
     * @param  playInfo       { round: 1, nickName: "", playerNo: 1, choice: "" }; // 개별선택정보
     * @return playResultInfo { round: 1, nextRound:1, isP1End:false, p1NickName:"", p1Choice: "", p1Score: 0, isP2End: false, p2NickName:"", p2Choice: "", p2Score: 0 }; // 개별선택취합결과
     */
    socket.on("play game", (playInfo) => {
      if (playResultInfo.isP1End || playResultInfo.isP2End) {
        if (playInfo.playerNo === 1) {
          playResultInfo.round = playInfo.round;
          playResultInfo.nextRound = playInfo.round;
          playResultInfo.isP1End = true;
          playResultInfo.p1NickName = playInfo.nickName;
          playResultInfo.p1Choice = playInfo.choice;
        } else if (playInfo.playerNo === 2) {
          playResultInfo.round = playInfo.round;
          playResultInfo.nextRound = playInfo.round;
          playResultInfo.isP2End = true;
          playResultInfo.p2NickName = playInfo.nickName;
          playResultInfo.p2Choice = playInfo.choice;
        }
      }

      // 1,2번 모두 선택 완료시 라운드 점수계산
      if (playResultInfo.isP1End && playResultInfo.isP2End) {
        if (playResultInfo.p1Choice === "O" && playResultInfo.p2Choice === "O") {
          playResultInfo.p1Score = 3;
          playResultInfo.p2Score = 3;
        } else if (playResultInfo.p1Choice === "O" && playResultInfo.p2Choice === "X") {
          playResultInfo.p1Score = 0;
          playResultInfo.p2Score = 5;
        } else if (playResultInfo.p1Choice === "X" && playResultInfo.p2Choice === "O") {
          playResultInfo.p1Score = 5;
          playResultInfo.p2Score = 0;
        } else if (playResultInfo.p1Choice === "X" && playResultInfo.p2Choice === "X") {
          playResultInfo.p1Score = 1;
          playResultInfo.p2Score = 1;
        }

        // 총점계산
        p1TotScore += playResultInfo.p1Score;
        p2TotScore += playResultInfo.p2Score;
        playResultInfo.p1TotScore = p1TotScore;
        playResultInfo.p2TotScore = p2TotScore;

        // 다음라운드 설정
        if (playResultInfo.nextRound >= lastRound) {
          // 게임종료시 nextRound = -1
          playResultInfo.nextRound = -1;
        } else {
          // 게임진행시 nextRound ++
          playResultInfo.nextRound = playInfo.round + 1;
        }

        io.emit("play game", playResultInfo);

        // 전송후 게임결과 클리어
        if (playResultInfo.nextRound === -1) {
          // 게임종료시 : 다시 1라운드 준비
          p1TotScore = 0; // p1 총점
          p2TotScore = 0; // p2 총점
          playResultInfo.round = 1;
          playResultInfo.nextRound = 1;
          playResultInfo.p1TotScore = 0;
          playResultInfo.p2TotScore = 0;
          playResultInfo = { ...playResultInfo, ...playResultInit }; //결과전송후 round, nextRound, p1TotScore, p2TotScore  만 제외하고 클리어
        } else {
          // 게임진행시 nextRound ++
          playResultInfo.nextRound = playInfo.round + 1;
          playResultInfo = { ...playResultInfo, ...playResultInit }; //결과전송후 round, nextRound, p1TotScore, p2TotScore  만 제외하고 클리어
        }
      } else {
        // 한사람만 선택시
        if (playInfo.playerNo === 1) {
          playResultInfo.round = playInfo.round;
          playResultInfo.nextRound = playInfo.round;
          playResultInfo.isP1End = true;
          playResultInfo.p1NickName = playInfo.nickName;
          playResultInfo.p1Choice = playInfo.choice;
        } else if (playInfo.playerNo === 2) {
          playResultInfo.round = playInfo.round;
          playResultInfo.nextRound = playInfo.round;
          playResultInfo.isP2End = true;
          playResultInfo.p2NickName = playInfo.nickName;
          playResultInfo.p2Choice = playInfo.choice;
        }
        io.emit("play game", playResultInfo);
      }
    });

    /**
     * on go waiting room
     * @param { isPlayNo1GoWaitingRoom: false, isPlayNo2GoWaitingRoom: true }
     * @return
     */
    socket.on("go waiting room", (msg) => {
      goWaitingRoomProcess(msg);
    });

    /**
     * on disconnect
     * @param nickName : login nickName
     * @return
     */
    socket.on("disconnect", () => {
      disconnectProcess();
    });

    /**
     * 최초 비로그인 접속처리 - 현재 접속중인 유저목록 전송
     * @param
     * @return
     */
    async function connectProcess() {
      const sockets = await io.fetchSockets();

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        if (_socket.data.playerNo > 0) {
          loginUserList.push({ nickName: _socket.data.nickName, playerNo: _socket.data.playerNo });
        }
      }
      io.emit("connect user", { isLoginOk: false, allUserCount: io.of("/").sockets.size, loginUserList });
    }

    /**
     * 로그인 처리 : 아이디 중복체크 후 없으면 로그인 처리
     * @param tempLoginId : 입력한 로그인 아이디
     * @return
     */
    async function joinUserProcess(tempLoginId) {
      const sockets = await io.fetchSockets();

      // 닉네임 중복체크
      for (const _socket of sockets) {
        if (tempLoginId === _socket.data.nickName) {
          io.emit("join user", { isLoginOk: false, errMsg: "DUP_LOGIN_ID", nickName: tempLoginId, playerNo: 0 }); // 중복발생시
          return;
        }
      }

      // 중복없을때
      socket.data.nickName = tempLoginId;
      //socket.data.playerNo = ++playerNoIdx;
      socket.data.playerNo = 999; // login 성공시, 관전(999) 으로 참여

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        if (_socket.data.playerNo > 0) {
          loginUserList.push({ nickName: _socket.data.nickName, playerNo: _socket.data.playerNo });
        }
      }
      io.emit("join user", { isLoginOk: true, errMsg: "LOGIN_OK", nickName: socket.data.nickName, playerNo: socket.data.playerNo, allUserCount: io.of("/").sockets.size, loginUserList }); // 중복없음
    }

    /**
     * 게임참여 처리 : 선착순으로 playerNo 1,2번 순번 부여
     * @param nickName
     * @return
     */
    async function enterGameProcess(nickName) {
      const sockets = await io.fetchSockets();
      let isPlayer = false; // 선수여부

      // 1,2번이 비었으면 선수 등록 , 아니면 관전(999)
      let tempP1 = sockets.filter((so) => so.data.playerNo === 1);
      let tempP2 = sockets.filter((so) => so.data.playerNo === 2);
      if (tempP1.length === 0) {
        isPlayer = true;
        socket.data.playerNo = 1;
      } else if (tempP2.length === 0) {
        isPlayer = true;
        socket.data.playerNo = 2;
      } else if (tempP2.length === 0) {
        isPlayer = false;
        socket.data.playerNo = 999;
      }

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        if (_socket.data.playerNo > 0) {
          loginUserList.push({ nickName: _socket.data.nickName, playerNo: _socket.data.playerNo });
        }
      }

      io.emit("enter game", { isPlayer, nickName: socket.data.nickName, playerNo: socket.data.playerNo, loginUserList });
    }

    /**
     * 정상게임종료후  대기실 이동처리
     * @param { isPlayNo1GoWaitingRoom: false, isPlayNo2GoWaitingRoom: true }
     * @return
     */
    async function goWaitingRoomProcess(msg) {
      const sockets = await io.fetchSockets();

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        if (_socket.data.playerNo === 1 && msg.isPlayNo1GoWaitingRoom) {
          _socket.data.playerNo = 999;
        }
        if (_socket.data.playerNo === 2 && msg.isPlayNo2GoWaitingRoom) {
          _socket.data.playerNo = 999;
        }
        loginUserList.push({ nickName: _socket.data.nickName, playerNo: _socket.data.playerNo });
      }
      io.emit("go waiting room", loginUserList);
    }

    /**
     * 로그아웃 처리 : 로그인 유저목록 emit -> client 에서 선수배치(관전목록) 갱신
     * nextRound = -2 -> 화면 logout 에 대한 점수표시 ( 남은 사람 기권승 )
     * @param nickName
     * @return
     */
    async function disconnectProcess() {
      const sockets = await io.fetchSockets();

      // 선수 퇴장시 nextRound = -2 로 설정
      if (socket.data.playerNo === 1 || socket.data.playerNo === 2) {
        p1TotScore = 0; // p1 총점
        p2TotScore = 0; // p2 총점
        playResultInfo = { ...playResultInfo, nextRound: -2 };
      }

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        if (_socket.data.playerNo > 0) {
          loginUserList.push({ nickName: _socket.data.nickName, playerNo: _socket.data.playerNo });
        }
      }

      socket.broadcast.emit("user logout", { logoutUser: socket.data, playResultInfo, allUserCount: io.of("/").sockets.size, loginUserList });

      // 전송후 게임결과 클리어
      // 다시 1라운드 준비
      p1TotScore = 0; // p1 총점
      p2TotScore = 0; // p2 총점
      playResultInfo.round = 1;
      playResultInfo.nextRound = 1;
      playResultInfo.p1TotScore = 0;
      playResultInfo.p2TotScore = 0;
      playResultInfo = { ...playResultInfo, ...playResultInit }; //결과전송후 round, nextRound, p1TotScore, p2TotScore  만 제외하고 클리어
    }

    socket.on("choice", (msg) => {
      io.emit("choice", msg);
    });

    socket.on("next round", (msg) => {
      io.emit("next round", msg);
    });

    socket.on("game over", (msg) => {
      io.emit("game over", msg);
    });
  });
};
