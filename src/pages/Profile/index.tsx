import React, { useRef, useCallback } from 'react';
import { KeyboardAvoidingView, View, Platform, ScrollView, TextInput, Alert } from 'react-native';
import ImagePicker from 'react-native-image-picker';

import { useNavigation } from '@react-navigation/native';
import { Form } from '@unform/mobile';
import { FormHandles } from '@unform/core';
import Icon from 'react-native-vector-icons/Feather';

import * as Yup from 'yup';
import api from '../../services/api';

import getValidationErrors from '../../utils/getValidationErrors';

import Input from '../../components/Input';
import Button from '../../components/Button';

import {
  Container,
  BackButton,
  Title,
  UserAvatarButton,
  UserAvatar
} from './styles';
import { useAuth } from '../../hooks/auth';


interface ProfileFormData {
  name: string;
  email: string;
  old_password: string;
  password: string;
  password_confirmation: string;
}

const Profile: React.FC = () => {
  const { user, updatedUser } = useAuth();
  const navigation = useNavigation();
  const formRef = useRef<FormHandles>(null);
  const emailInputRef = useRef<TextInput>(null);
  const oldPasswordInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const passwordConfirmationInputRef = useRef<TextInput>(null);


  const handleUpdateProfile = useCallback(async (data: ProfileFormData) => {
    try {
      formRef.current?.setErrors({});
      const schema = Yup.object().shape({
        name: Yup.string().required('Name is required.'),
        email: Yup.string()
          .required('E-mail is required.')
          .email('Invalid e-mail format.'),
        old_password: Yup.string(),
        password: Yup.string().when('old_password', {
          is: val => !!val.length,
          then: Yup.string().required(
            'To updated password, this field is required',
          ),
          otherwise: Yup.string(),
        }),
        password_confirmation: Yup.string()
          .when('old_password', {
            is: val => !!val.length,
            then: Yup.string().required(
              'To updated password, this field is required',
            ),
            otherwise: Yup.string(),
          })
          .oneOf([Yup.ref('password'), undefined], 'Passwords must match'),
      });

      await schema.validate(data, {
        abortEarly: false,
      });

      const {
        name,
        email,
        old_password,
        password,
        password_confirmation,
      } = data;

      const formData = {
        name,
        email,
        ...(data.password
          ? {
            old_password,
            password,
            password_confirmation,
          }
          : {}),
      };

      const response = await api.put('/profile', formData);

      updatedUser(response.data);

      Alert.alert('Everything looks good!', 'Your profile is successfully updated.');

      navigation.goBack();
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        const errors = getValidationErrors(err);
        formRef.current?.setErrors(errors);

        return;
      }
      Alert.alert('Profile update error!', 'There was an error updating your account, please try again later');
    }
  }, [navigation, updatedUser]);

  const handleUpdateavatar = useCallback(() => {
    ImagePicker.showImagePicker({
      title: 'Select picture',
      cancelButtonTitle: 'Cancel',
      takePhotoButtonTitle: 'Take a picture',
      chooseFromLibraryButtonTitle: 'Choose from gallery',
    }, response => {
      if (response.didCancel) {
        return;
      }

      if (response.error) {
        Alert.alert('There was an error when updating your avatar')
      }

      const data = new FormData();

      data.append('avatar', {
        type: 'image/jpeg',
        name: `${user.id}.jpg`,
        uri: response.uri,
      });

      api.patch('/users/avatar', data).then((avatarResponse) => {
        updatedUser(avatarResponse.data);
      });
    });
  }, [updatedUser, user.id]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flex: 1 }}
        >
          <Container>
            <BackButton onPress={handleGoBack}>
              <Icon name="chevron-left" size={24} color="#999591" />
            </BackButton>

            <UserAvatarButton onPress={handleUpdateavatar}>
              <UserAvatar source={{ uri: user.avatar_url }} />
            </UserAvatarButton>
            <View>
              <Title>
                My Profile
            </Title>
            </View>

            <Form initialData={user} ref={formRef} onSubmit={handleUpdateProfile}>
              <Input
                autoCapitalize="words"
                name="name"
                icon="user"
                placeholder="Name"
                returnKeyType="next"
                onSubmitEditing={() => {
                  emailInputRef.current?.focus()
                }}
              />
              <Input
                ref={emailInputRef}
                keyboardType="email-address"
                autoCorrect={false}
                autoCapitalize="none"
                name="email"
                icon="mail"
                placeholder="E-mail"
                returnKeyType="next"
                onSubmitEditing={() => {
                  oldPasswordInputRef.current?.focus()
                }}
              />
              <Input
                ref={oldPasswordInputRef}
                secureTextEntry
                textContentType="newPassword"
                name="old_password"
                icon="lock"
                placeholder="Current Password"
                returnKeyType="next"
                containerStyle={{ marginTop: 16 }}
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus()
                }}
              />

              <Input
                ref={passwordInputRef}
                secureTextEntry
                textContentType="newPassword"
                name="password"
                icon="lock"
                placeholder="New Password"
                returnKeyType="next"
                onSubmitEditing={() => {
                  passwordConfirmationInputRef.current?.focus()
                }}
              />
              <Input
                ref={passwordConfirmationInputRef}
                secureTextEntry
                textContentType="newPassword"
                name="password_confirmation"
                icon="lock"
                placeholder="Password Confirmation"
                returnKeyType="send"
                onSubmitEditing={() => formRef.current?.submitForm()}
              />
              <Button onPress={() => formRef.current?.submitForm()}>Confirm changes</Button>
            </Form>

          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

export default Profile;
