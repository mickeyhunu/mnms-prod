const express  = require('express');
const router   = express.Router();
const { SITE_CD, ENC_KEY, CERT_URL, DEC_URL, RET_URL } = require('../cfg/site_conf_inc');
const { encryptJson, decryptJson }                      = require('../utils/Crypto');


router.route('/')
    .get((req, res) => {
        const error = req.query.error || '';
        res.render('index', { error });
    })
    .post(async (req, res) => {
        const ordr_idxx = req.body.ordr_idxx || '';

        // 본인확인 거래등록 API 호출
        const req_data = {
            site_cd:     SITE_CD,
            ordr_idxx:   ordr_idxx,
            Ret_URL:     RET_URL,
            web_siteid:  '',
            param_opt_1: '',
            param_opt_2: '',
            param_opt_3: '',
        };

        const req_json_str     = JSON.stringify(req_data);
        const { enc_data, rv } = encryptJson(req_json_str, ENC_KEY, SITE_CD);

        const headers = {
            'Content-Type': 'application/json',
            'site_cd': SITE_CD,
            'rv': rv
        };

        const response   = await fetch(CERT_URL, { method: 'POST', headers, body: enc_data });
        const reg_result = await response.json();

        if (reg_result.res_cd !== '0000') {
            const error = `거래등록에 실패하였습니다.\n코드: ${reg_result.res_cd || ''}\n메시지: ${reg_result.res_msg || ''}`;
            return res.render('index', { error });
        }

        const reg_cert_key = reg_result.reg_cert_key;
        req.session.reg_cert_key = reg_cert_key;
        req.session.ordr_idxx    = ordr_idxx;

        res.render('index', {
            call_url:     reg_result.call_url,
            reg_cert_key: reg_cert_key,
        });
    });


router.post('/return', async (req, res) => {
    const res_cd          = req.body.res_cd       || '';
    const res_msg         = req.body.res_msg       || '';
    const cb_reg_cert_key = req.body.reg_cert_key || ''; // 본인확인 완료 후 KCP 콜백으로 내려오는 거래등록키

    // TODO: 가맹점에서는 세션이 아닌 DB에 저장된 거래등록키(reg_cert_key)와 주문번호(ordr_idxx)를 확인하여
    //       /return 콜백으로 내려온 reg_cert_key 값을 통해 일치하는지 검증 후 본인확인 결과에 따른 처리 진행 권장
    if (cb_reg_cert_key !== req.session.reg_cert_key) {
        delete req.session.reg_cert_key;
        delete req.session.ordr_idxx;
        const msg = '거래등록키 불일치: 유효하지 않은 요청입니다.';
        return res.render('return', { success: false, index_url: `/?error=${encodeURIComponent(msg)}` });
    }

    if (res_cd !== '0000') {
        delete req.session.reg_cert_key;
        delete req.session.ordr_idxx;
        const msg = `본인확인에 실패하였습니다.\n코드: ${res_cd}\n메시지: ${res_msg}`;
        return res.render('return', { success: false, index_url: `/?error=${encodeURIComponent(msg)}` });
    }

    const reg_cert_key = req.session.reg_cert_key;
    const ordr_idxx    = req.session.ordr_idxx;

    // TODO: 가맹점 DB에 저장된 거래등록키(reg_cert_key)와 주문번호(ordr_idxx)를 확인하여
    //       /return 콜백으로 내려온 reg_cert_key 값을 통해 일치하는지 검증 후 결과조회 API 호출

    // 본인확인 결과 조회 API 호출
    const headers = {
        'Content-Type': 'application/json',
        'site_cd': SITE_CD,
    };
    const body = JSON.stringify({ reg_cert_key, ordr_idxx });

    const response     = await fetch(DEC_URL, { method: 'POST', headers, body });
    const query_result = await response.json();

    delete req.session.reg_cert_key;
    delete req.session.ordr_idxx;

    if (query_result.res_cd !== '0000') {
        const msg = `결과조회에 실패하였습니다.\n코드: ${query_result.res_cd || ''}\n메시지: ${query_result.res_msg || ''}`;
        return res.render('return', { success: false, index_url: `/?error=${encodeURIComponent(msg)}` });
    }

    const enc_cert_data = query_result.enc_cert_data || '';
    const rv            = query_result.rv            || '';

    // 복호화 응답 결과에 대한 상세한 값은 연동 가이드를 참고하시기 바랍니다.
    const cert_data = decryptJson(enc_cert_data, rv, ENC_KEY, SITE_CD);
    // const CI = cert_data.CI || '';
    // const DI = cert_data.DI || '';

    res.render('return', { success: true, result_url: '/result' });
});


router.get('/result', (req, res) => {
    res.render('index', { verified: true });
});


module.exports = router;
