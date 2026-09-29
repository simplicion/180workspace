import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../core/auth/one_eighty_sso_service.dart';
import '../../core/providers.dart';
import 'auth_provider.dart';
import 'auth_repository.dart';

enum _Step { credentials, mfa }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _mfa = TextEditingController();
  _Step _step = _Step.credentials;
  bool _busy = false;
  bool _obscure = true;
  String? _error;
  String? _notice;
  StreamSubscription? _oauthSub;

  @override
  void initState() {
    super.initState();
    _oauthSub = ref.read(deepLinksProvider).oauthCallbacks.listen((cb) async {
      final code = cb.uri.queryParameters['code'];
      if (code != null && code.isNotEmpty) {
        setState(() {
          _busy = true;
          _error = null;
        });
        try {
          final sso = OneEightySsoService();
          final data = await sso.handleCallbackUri(cb.uri);
          final accessToken = data['access_token'] as String;
          final refreshToken = data['refresh_token'] as String?;
          await ref.read(tokenStoreProvider).saveSession(accessToken: accessToken, refreshToken: refreshToken);
          await ref.read(sessionProvider.notifier).retryRestore();
        } catch (e) {
          if (mounted) setState(() => _error = errorText(e));
        } finally {
          if (mounted) setState(() => _busy = false);
        }
      }
    });
  }

  @override
  void dispose() {
    _oauthSub?.cancel();
    _email.dispose();
    _password.dispose();
    _mfa.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final result = await ref.read(sessionProvider.notifier).login(
            email: _email.text,
            password: _password.text,
            mfaToken: _step == _Step.mfa ? _mfa.text.trim() : null,
          );
      if (!mounted) return;
      switch (result) {
        case LoginSuccess():
          break; // the router redirects
        case LoginMfaRequired():
          setState(() => _step = _Step.mfa);
        case LoginOnboardingRequired(:final message):
          setState(() => _notice =
              '$message\n\nFinish setting up your workspace on the web at ${AppConfig.webAppUrl}, then sign in here.');
        case LoginPasswordSetupRequired(:final message):
          setState(() => _notice = '$message\n\nSet your password from the invitation email, then sign in here.');
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _google() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final g = GoogleSignIn.instance;
      final clientId = AppConfig.googleServerClientId;
      if (clientId.isNotEmpty) {
        await g.initialize(serverClientId: clientId);
      } else {
        await g.initialize();
      }
      final account = await g.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null) throw Exception('Google did not return an ID token.');
      await ref.read(sessionProvider.notifier).loginWithGoogle(idToken);
    } on GoogleSignInException catch (e) {
      if (e.code != GoogleSignInExceptionCode.canceled && mounted) {
        setState(() => _error = 'Google sign-in: ${e.description ?? e.code.name}');
      }
    } catch (e) {
      if (mounted) {
        final err = errorText(e);
        setState(() => _error = err.contains('GOOGLE_SERVER_CLIENT_ID')
            ? 'Google sign-in is initializing. Please sign in with your email & password.'
            : err);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _loginWith180Identity() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final sso = OneEightySsoService();
      await sso.launch180IdentityLogin();
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgot() async {
    final email = await promptText(context, title: 'Reset password', label: 'Work email', initial: _email.text, action: 'Send link');
    if (email == null || email.isEmpty || !mounted) return;
    final ok = await guarded(context, () => ref.read(authRepositoryProvider).forgotPassword(email).then((_) => true));
    if (ok == true && mounted) showInfo(context, 'If that email has an account, a reset link is on its way.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: 420),
              child: Form(
                key: _form,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Center(
                    child: Container(
                      width: 84,
                      height: 84,
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.15),
                            blurRadius: 16,
                            offset: Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Image.asset(
                        'assets/logo/brand_favicon.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  SizedBox(height: 20),
                  Text(
                    '180 Social Studio',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    _step == _Step.mfa
                        ? 'Enter the 6-digit code from your authenticator app.'
                        : 'Your Autonomous AI 180 Social Studio.\nSign in to manage & automate your channels.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textSecondary),
                  ),
                  SizedBox(height: 28),
                  if (_step == _Step.credentials) ...[
                    // Primary 180 Identity SSO Button
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Color(0xFF6366F1).withValues(alpha: 0.35),
                            blurRadius: 16,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        key: Key('login.180identity'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        onPressed: _busy ? null : _loginWith180Identity,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text('180', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.w900, fontSize: 12)),
                            ),
                            SizedBox(width: 10),
                            Flexible(
                              child: Text(
                                'Get started with 180 Identity',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(child: Divider(color: Color(0x33FFFFFF))),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 12),
                          child: Text('or continue with email', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.textSecondary)),
                        ),
                        Expanded(child: Divider(color: Color(0x33FFFFFF))),
                      ],
                    ),
                    SizedBox(height: 20),
                    TextFormField(
                      key: Key('login.email'),
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: [AutofillHints.email],
                      textInputAction: TextInputAction.next,
                      decoration: fieldDecoration('Work email'),
                      validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
                    ),
                    SizedBox(height: 14),
                    TextFormField(
                      key: Key('login.password'),
                      controller: _password,
                      obscureText: _obscure,
                      autofillHints: [AutofillHints.password],
                      onFieldSubmitted: (_) => _submit(),
                      decoration: fieldDecoration('Password',
                          suffix: IconButton(
                            icon: Icon(_obscure ? Icons.visibility_rounded : Icons.visibility_off_rounded),
                            onPressed: () => setState(() => _obscure = !_obscure),
                          )),
                      validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(onPressed: _busy ? null : _forgot, child: Text('Forgot password?')),
                    ),
                  ] else ...[
                    TextFormField(
                      key: Key('login.mfa'),
                      controller: _mfa,
                      autofocus: true,
                      keyboardType: TextInputType.number,
                      maxLength: 8,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: fieldDecoration('Verification code'),
                      validator: (v) => (v == null || v.trim().length < 6) ? 'Enter the code' : null,
                    ),
                    TextButton(
                      onPressed: _busy ? null : () => setState(() => _step = _Step.credentials),
                      child: Text('Use a different account'),
                    ),
                  ],
                  if (_error != null) _Banner(text: _error!, color: AppTheme.error, icon: Icons.error_outline_rounded),
                  if (_notice != null)
                    _Banner(text: _notice!, color: AppTheme.warning, icon: Icons.info_outline_rounded, onOpenWeb: true),
                  SizedBox(height: 16),
                  ElevatedButton(
                    key: Key('login.submit'),
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(_step == _Step.mfa ? 'Verify' : 'Sign in', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  if (_step == _Step.credentials) ...[
                    SizedBox(height: 20),
                    Row(children: [
                      Expanded(child: Divider()),
                      Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('or', style: TextStyle(color: AppTheme.textMuted))),
                      Expanded(child: Divider()),
                    ]),
                    SizedBox(height: 20),
                    OutlinedButton.icon(
                      key: Key('login.google'),
                      onPressed: _busy ? null : _google,
                      icon: Icon(Icons.g_mobiledata_rounded, size: 28),
                      label: Text('Continue with Google'),
                    ),
                  ],
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text, required this.color, required this.icon, this.onOpenWeb = false});
  final String text;
  final Color color;
  final IconData icon;
  final bool onOpenWeb;

  @override
  Widget build(BuildContext context) => Container(
        margin: EdgeInsets.only(top: 14),
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, color: color, size: 18),
            SizedBox(width: 8),
            Expanded(child: Text(text, style: TextStyle(color: AppTheme.textPrimary, fontSize: 13))),
          ]),
          if (onOpenWeb)
            TextButton(
              onPressed: () => launchUrl(Uri.parse(AppConfig.webAppUrl), mode: LaunchMode.externalApplication),
              child: Text('Open 180 Workspace on the web'),
            ),
        ]),
      );
}
